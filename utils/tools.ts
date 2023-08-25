import CryptoJS from 'crypto-js'
//! 这里是用于AES信息加解密的密钥，均为16为字母+数字的组合，在前后端请保持一致
const key = CryptoJS.enc.Utf8.parse("")
const iv = CryptoJS.enc.Utf8.parse("")

const createHeader = (apiKey: string) => {
    return {
        'authorization': 'Bearer ' + apiKey,
        'cookies': 'Hm_lvt_02fa69f9f583d4cfafb352ab1c0e69ff=1689205715,1689292038,1689328768,1689375888; Hm_lpvt_02fa69f9f583d4cfafb352ab1c0e69ff=1689398362'
    }
}

const dataDecrypt = (word: any) => {
    let decrypt = CryptoJS.AES.decrypt(word, key, { iv , mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    let decryptedStr = decrypt.toString(CryptoJS.enc.Utf8);
    return decryptedStr.toString();
}

/**AES加密数据（注：无需提前将其转为string，如果类型传入object的对象可以自动将其stringify再加密） */
const dataEncrypt = (word: any | object) => {
    let data = typeof word == 'object' ? JSON.stringify(word) : word
    let srcs = CryptoJS.enc.Utf8.parse(data);
    let encrypted = CryptoJS.AES.encrypt(srcs, key, { iv , mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    return encrypted.toString().replace(/=/g,'');
}

export {createHeader, dataDecrypt, dataEncrypt}

