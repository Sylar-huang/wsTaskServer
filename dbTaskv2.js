/**
 * File Created by Lenovo at 2017/9/14.
 * Copyright 2016 CMCC Corporation Limited.
 * All rights reserved.
 *
 * This software is the confidential and proprietary information of
 * ZYHY Company. ("Confidential Information").  You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license.
 *
 *
 * @Desc
 * @author Lenovo
 * @date 2017/9/14
 * @version
 */


var MongodbOperate = require('./mongodbOperate')
var mongodb = '//172.23.31.73:27017/tance'
var mongodbTance = new MongodbOperate(mongodb)

function dbTask(logger) {
    this.setDeviceStatus = function (deviceList, status) {
        var search = {}
        if(deviceList.length != 0){
            search = {_id: {$in: deviceList}}
        }
        return mongodbTance.modify('taskDevices',search , {status: status})
            .then(function (data) {
                logger.info('[Worker '+ process.pid+']: set devices status to '+status+' successful ! with data :' + data)
            }, function (err) {
                logger.error(err)
            })
    }
    this.registDevice = function (deviceList, status, registerDevice) {
        return mongodbTance
            .query('taskDevices', {"_id": deviceList[0]}) //query if this device exists
            .then(function (result) {
                if (result.length === 0) {
                    return mongodbTance.insert('taskDevices', registerDevice) //insert new device
                } else {
                    return mongodbTance.modify('taskDevices', {"_id": deviceList[0]}, {'status': status}) // update this device status to 0
                }

            })
            .then(function (data) {
                logger.debug('[Worker '+ process.pid+']: insert or update device: ' + deviceList[0] + ' success!')
            })
    }
    this.updateResult = function (deviceList, resultCollection, data, deviceTaskNumber, status) {
        return mongodbTance.insert(resultCollection, data)
            .then(function () {
                console.log(deviceTaskNumber)
                //set this device status to 0: idle
                // if (deviceTaskNumber === 0) {
                //     return mongodbTance.modify('taskDevices', {_id: deviceList[0]}, {status: status})
                // }
                logger.info('[Worker '+ process.pid+']:fullfilled request from : '+deviceList[0]+' with taskNumb: ' + deviceTaskNumber);
                logger.debug('[Worker '+ process.pid+']:insert result to ' + resultCollection + ' success :' + deviceList[0])
            }).then(function () {
                // logger.debug('update device:  ' + deviceList[0] + ' to 0 success')
            }).catch(function (err) {
                logger.error(err)
            })
    }
    this.findTasks = function (taskArray) {
        var params = {};
        var allTaskList = [];
        return new Promise(function (resolve, reject) {
            mongodbTance.query('netDiagnoseConfig', {})
                .then(function (result) {
                    return Promise.all(taskArray.map(function (collection) {
                        return mongodbTance.query(collection, {state: 'false'})
                            .then(function (data) {
                                //send ping task to client
                                for (var k = 0; k < data.length; k++) {
                                        allTaskList.push({task: data[k], params: result[0]})
                                        //update task status
                                }
                                return mongodbTance.modify(collection, {state: 'false'}, {state: 'true'})
                            })
                    }))
                })
                .then(function (success) {
                    success.forEach(function (item) {
                        if(item.result.nModified >0 ){
                            // console.log(item)
                            logger.debug(item)
                        }
                    })
                    resolve(allTaskList);
                })
                .catch(function (err) {
                    logger.error(err);
                    reject(err)
                })

        })
    }
}
module.exports = dbTask;