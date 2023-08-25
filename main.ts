import axios from 'axios'
//import bodyParser from 'body-parser'
import express from 'express'
import expressWs from "express-ws"
import cors from 'cors'
import fs from 'fs'
import * as WsAPIS from './config/interface/main'
import dialog from './config/dialog.json'
import {createHeader, dataDecrypt} from "./utils/tools";
process.title = 'gpt-api'

const wsInstance = expressWs(express())
const app = wsInstance.app
let useGpt3 = 0
app.use(cors())
let apiKey = ''

//更新apiKey
const updateApiKey = () => {
    fs.readFile(__dirname + '/config/apiKey.key', (err, data) => {
        if (err) return
        apiKey = data.toString()
    })
}

app.get('/ai/moss',(req, res) => {
    res.send('ChatGPT training playground!')
})

app.get('/ai/getConfig',(req, res) => {
    //dialog对应系统的did
    res.json({
      "templete": "GPT4",
      "systemPrompt": "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.",
      "dialog": "14"
  })
})

app.ws('/ai/moss', (ws, req) => {
    ws.on('open', () => {
        const json: WsAPIS.ClientHello = {'status': 'ready', 'did': dialog.dialog_id}
        return ws.send(JSON.stringify(json))
    })

    ws.on('message', msg => {
          let clientData: WsAPIS.ClientQuestion | WsAPIS.ClientSetting
          try {
              clientData = JSON.parse(msg.toString())
          } catch(err) {
              const json: WsAPIS.ServerFailed = {'type': 'f', 'msg': dialog.response[0]}
              return ws.send(JSON.stringify(json))
          }
          if (clientData.type === 'q'){
            //校验授权码
              try {
                  let _code = clientData.auth
                  let code = parseInt(dataDecrypt(_code))
                  if (new Date().getTime() - code > 5000){
                      const json: WsAPIS.ServerFailed = {'type': 'f', 'msg': dialog.response[3]}
                      return ws.send(JSON.stringify(json))
                  }
              } catch(err) {
                  const json: WsAPIS.ServerFailed = {'type': 'f', 'msg': dialog.response[3]}
                  return ws.send(JSON.stringify(json))
              }
              let isFinished = false
              axios.post(dialog.test_api_domain,{
                  dialog_id: clientData.did,
                  is_regenerate: 0,
                  parent_message_id: clientData.cid,
                  pid: clientData.pid,
                  prompt: clientData.q,
                  //系统prompt，保持不变
                  systemMessage: `You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.`,
                  systemType: useGpt3 ? '3.5' : '4+'
              }, {responseType: "stream", headers: createHeader(apiKey)}).then(r => {
                  r.data.on('data', (chunk: Buffer) => {
                      const ori = chunk.toString()
                      try {
                          const text = JSON.parse(JSON.parse(JSON.stringify(ori)))
                          if (isFinished) {
                            isFinished = false
                            return
                          }
                          if ((text.errmsg && text.errmsg.includes('I\'m sorry')) || text.errcode === 401){
                            const json: WsAPIS.ServerFailed = {'type': 'f', 'msg': dialog.response[2]}
                            ws.send(JSON.stringify(json))
                            isFinished = true
                            return
                          }
                          if (text.is_finished) isFinished = true
                          let answer = text.content ? text.content : text.message_info.assistant
                          let l = answer[answer.length - 1]
                          const json: WsAPIS.ServerAnswer = {
                            'a': text.content ? text.content : text.message_info.assistant,
                            'cid': text.gpt_message_id ? text.gpt_message_id : text.message_info.message_id,
                            'is_f': text.is_finished ? 1 : 0,
                            'pid': text.answer_id,
                            'did': text.dialog_id,
                            'type': 'a'
                        }
                        if (l === '。' || l === '?' || l === '.'
                        || l === '？' || l === '！' || l === '!' || l === ';' 
                        || l === '；' || l === ',' || l === ':' 
                        || l === '：'){
                          //分隔整句话
                          ws.send(JSON.stringify(json))
                          }else if (text.is_finished){
                            ws.send(JSON.stringify(json))
                          }
                      } catch (error) {}
                  })
              }).catch(() => {
                  const json: WsAPIS.ServerFailed = {'type': 'f', 'msg': dialog.response[2]}
                  return ws.send(JSON.stringify(json))
              })
          }else if (clientData.type === 's'){
              if (clientData.setting = 'gpt'){
                  //调整GPT版本
                  clientData.value === 0 ? useGpt3 = 1 : useGpt3 = 0
              }
          }else{
              const json: WsAPIS.ServerFailed = {'type': 'f', 'msg': dialog.response[1]}
              return ws.send(JSON.stringify(json))
          }
    })
})

app.listen(17780,() => {
    console.log('550W/ChatGPT Back_end is running on port 17780')
})

updateApiKey()
setInterval(() => updateApiKey(), 8800000)
