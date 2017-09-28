/**
 * File Created by Lenovo at 2017/9/13.
 * Copyright 2016 CMCC Corporation Limited.
 * All rights reserved.
 *
 * This software is the confidential and proprietary information of
 * ZYHY Company. ("Confidential Information").  You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license.
 *base64 decoder has been included in tea
 *
 * @Desc
 * @author Lenovo
 * @date 2017/9/13
 * @version
 */
// const encode = require('nodejs-base64-encode');
var xxtea = require('xxtea-node');
var password = 'cmhi.chinamobile.com'

function cloneObject(origin) {
    return Object.assign({}, origin)
}

function encrpytString(task) {
    let cloneTask = cloneObject(task);
    let encrypt_data = xxtea.encrypt(xxtea.toBytes(JSON.stringify(cloneTask)), xxtea.toBytes(password))
    let ecryptedTask = new Buffer(encrypt_data).toString('base64')
    return ecryptedTask;
}
function decryptString(message,logger) {
    // let decodedMessage = encode.decode(message, 'base64');
    var decrypt_data
    try{
        decrypt_data = xxtea.toString(xxtea.decrypt(message, xxtea.toBytes(password)))
    }catch(e){
        logger.error('decrypt error!')
    }
    return decrypt_data;
}

module.exports = Object.create(null, {
    encrpytString: { value: encrpytString },
    decryptString: { value: decryptString }
});