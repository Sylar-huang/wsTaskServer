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
    this.setDeviceStatus = function (deviceList, status,deviceSheet) {
        var search = {}
        if (deviceList.length != 0) {
            search = {_id: {$in: deviceList}}
        }
        return mongodbTance.modify(deviceSheet, search, {status: status})
            .then(function (data) {
                logger.info('[Worker ' + process.pid + ']: set devices in '+deviceSheet+' status to ' + status + ' successful ! with data :' + data)
            }, function (err) {
                logger.error(err)
            })
    }
    this.registDevice = function (deviceList, status, registerDevice,deviceSheet) {
        return mongodbTance
            .query(deviceSheet, {"_id": deviceList[0]}) //query if this device exists
            .then(function (result) {
                if (result.length === 0) {
                    return mongodbTance.insert(deviceSheet, registerDevice) //insert new device
                } else {
                    return mongodbTance.modify(deviceSheet, {"_id": deviceList[0]}, {'status': status}) // update this device status to 0
                }

            })
            .then(function (data) {
                logger.debug('[Worker ' + process.pid + ']: insert or update device to collection ' + deviceSheet+': ' + deviceList[0] + ' success!')
            })
    }
    this.updateResult = function (deviceList, resultCollection, data, deviceTaskNumber, status) {
        return mongodbTance.insert(resultCollection, data)
            .then(function () {
                console.log(deviceTaskNumber)
                //set this device status to 0: idle
                // if (deviceTaskNumber === 0) {
                //     return mongodbTance.modify(deviceSheet, {_id: deviceList[0]}, {status: status})
                // }
                logger.info('[Worker ' + process.pid + ']:fullfilled request from : ' + deviceList[0] + ' with taskNumb: ' + deviceTaskNumber);
                logger.debug('[Worker ' + process.pid + ']:insert result to ' + resultCollection + ' success :' + deviceList[0])
            }).then(function () {
                // logger.debug('update device:  ' + deviceList[0] + ' to 0 success')
            }).catch(function (err) {
                logger.error(err)
            })
    }
    this.findTasks = function (taskArray) {
        var params = {};
        var allTaskList = [];
        //this function is used to handle immediate task
        var handleImmediateTask = function (collection, result) {
            return mongodbTance.query(collection, {state: 'false', timing: 'false'})
                .then(function (data) {
                    //send ping task to client
                    for (var k = 0; k < data.length; k++) {
                        allTaskList.push({task: data[k], params: result[0]})
                        //update task status
                    }
                    if(data.length>0)
                        logger.debug('[Worker ' + process.pid + ']: found '+data.length+' immediate tasks : '+JSON.stringify(data) )
                    return mongodbTance.modify(collection, {state: 'false', timing: 'false'}, {
                        state: 'true',
                        timing: 'false'
                    })
                })
        }
        //this function is used to handle timming task
        var handleTimingTask = function (collection, result) {
            return mongodbTance.query(collection, {state: 'false', timing: 'true'})
                .then(function (data) {
                    var nowTime = new Date().getTime();
                    var updateTaskId = [];
                    var endTaskId = [];
                    for (let k = 0; k < data.length; k++) {
                        let beginTime = new Date(data[k].beginTime).getTime();
                        let endTime = new Date(data[k].endTime).getTime();
                        let lastUpdate = data[k].lastUpdate==undefined? beginTime:data[k].lastUpdate;
                        if (nowTime < endTime && nowTime - lastUpdate > data[k].second*1000) {
                            allTaskList.push({task: data[k], params: result[0]})
                            updateTaskId.push(data[k].taskId)
                        }
                        if (nowTime > endTime) {
                            endTaskId.push(data[k].taskId)
                        }
                        //update task status
                    }
                    if(data.length>0)
                        logger.debug('[Worker ' + process.pid + ']: found '+data.length+' timing tasks: '+ JSON.stringify(data) )
                    var updateData = [{
                        query: updateTaskId,
                        update:{lastUpdate: nowTime}
                    }, {
                        query: endTaskId,
                        update: {state: true }}]
                    return Promise.all(updateData.map(function (item) {
                        return mongodbTance.modify(collection, {taskId: {$in: item.query}}, item.update);
                    }))
                })
        }
        return new Promise(function (resolve, reject) {
            mongodbTance.query('netDiagnoseConfig', {})
                .then(function (result) {
                    return Promise.all(taskArray.map(function (collection) {
                        return Promise.all([handleImmediateTask(collection, result), handleTimingTask(collection, result)])
                    }))
                })
                .then(function (success) {
                    // success.forEach(function (item) {
                    //     if(item.result.nModified >0 ){
                    //         // console.log(item)
                    //         logger.debug(item)
                    //     }
                    // })
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