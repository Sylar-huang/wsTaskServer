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
 * @Desc handle ws event
 * @author Sylarhuang
 * @date 2017/9/14
 * @version
 * @method
 * wss create server
 * taskDistributor(task) distribute tasks to according client
 * onConnectionEvent(ws,req) register job on connection event
 * onMessageEvent(ws,message) register job on message event
 * TaskInterval fetch task list
 * heartbeatInterval keep heartbeat
 */
const WebSocket = require('ws');
// var MongodbOperate = require('./mongodbOperate')
// var mongodb = '//172.23.31.73:27017/tance'
// var mongodbFamily = '//172.23.31.73:27017/osgifamily'
// var mongodbTance = new MongodbOperate(mongodb)
var encrypt = require('./encrypt')
var dbTask = require('./dbTaskv3')
var dbTaskfamiliy = require('./dbTaskvFamily')
const url = require('url');

function wsHandler(server,logger,process,developMode) {
    var tasker = new dbTask(logger, process);
    var taskerFamily = new dbTaskfamiliy(logger, process);
    var taskArray = ['pingTask','traceRouteTask','speedTestTask']
    var clusterFlag = '';
    var deviceSheet = 'taskDevices';
    if(developMode) {
        taskArray = ['cluster_pingTask', 'cluster_traceRouteTask', 'cluster_speedTestTask'];
        clusterFlag = 'cluster_'
        deviceSheet = 'cluster_taskDevices';
    }
    const wsClientsTaskNumber = {};
    var wSize = 0;
    var serverParams = {
        verifyClient: function(info, done) {
            let urlquery = url.parse(info.req.url, true).query;
            // console.log(urlquery.deviceId)
            let validClient = typeof urlquery.deviceId == 'string' && typeof urlquery.manufacturer == 'string' && typeof urlquery.model == 'string'
            if(validClient){
                done(true)
            }
            else{
                logger.info('[Worker '+ process.pid+']: invalid client ' + info.req.connection.remoteAddress + ' , refuse connection!')
            }
        }
    }
    if(typeof server == 'number'){
        serverParams.port = server;
    }else if(typeof server == 'object'){
        serverParams.server = server
    }else {
        logger.error('[Worker '+ process.pid+']: wrong param server: '+ server)
    }

    //create websokcet
    const wss = new WebSocket.Server(serverParams, function () {
        console.log('ws server created at ' + server)
        tasker.setDeviceStatus([], 2,deviceSheet)
    })

    //task Distribute
    var taskDistributor = function(task) {
        var deviceList = task.task.sn
        var clientListLength = deviceList.length;
        //status: 1 - busy
        // tasker.setDeviceStatus(deviceList,1)
        //遍历所有
        for(let client of wss.clients) {
            for (var i = clientListLength-1; i >= 0; i--) {
                let device = deviceList[i];
                if (client.deviceId === device && client.readyState === WebSocket.OPEN ) {
                    // wsClientsTaskNumber[client.deviceId] ++;
                    //send obj to target
                    logger.debug('[Worker '+ process.pid+']: send task: ' + JSON.stringify(task)+ 'client.deviceId')
                    let enccryptedString = encrypt.encrpytString(task)
                    // console.log(enccryptedString)
                    client.send(enccryptedString)
                }
            }
        }

    }
    //connection event
    var onConnectionEvent = function (ws,req) {
        const data = url.parse(req.url, true).query;
        const ip = req.connection.remoteAddress || req.headers['x-forwarded-for'] ;
        wSize++
        logger.warn('[Worker '+ process.pid+']: client has connected with ip: '+ ip + ' now connection number is  '+ wSize)
        ws.deviceId = data.deviceId;
        //ws.taskNum = 0;
        //判断当前设备是否在任务表中
        if(!wsClientsTaskNumber.hasOwnProperty(ws.deviceId)){
            wsClientsTaskNumber[ws.deviceId] = 0;
        }
        logger.info('[Worker '+ process.pid+']: deviceId: '+ ws.deviceId + ' connected');
        //向mongodb写入数据表
        var registerDevice;
        taskerFamily.findDeviceInfo([ws.deviceId]).then(function (result) {
            ws.areacode = 'eeee';
            registerDevice = {
                //deviceid
                _id: data.deviceId,
                //probe version
                version: data.version,
                status: 0,
                manufacturer: data.manufacturer,
                model: data.model,
                areacode: 'eeee'
            }
            if(result.length>0) {
                registerDeviceareacode = result[0].areacode
                ws.areacode = result[0].areacode;
            }
            tasker.registDevice([data.deviceId],0,registerDevice,deviceSheet)
        })


        ///write device into mongodb

    }
    //message event
    var onMessageEvent = function (ws,message) {
        var data;
        let decryptMessage = encrypt.decryptString(message,logger);
        try{
            // data = JSON.parse(message)
            data = JSON.parse(decryptMessage)
            // console.log(data)
        } catch (e){
            logger.info('[Worker '+ process.pid+']: incoming json data error: '+ e)
            ws.send('Incorrect data format')
            throw new Error('incoming json data error: '+ e)

        }
        var timestamp  = new Date();
        data.date = timestamp;
        data.areacode = ws.areacode;
        // write data to mongodb result sheet
        var resultCollection;
        if(data.exception == ''){
            wsClientsTaskNumber[ws.deviceId] = 0;
        }
        // using this way

        // var resultCollection = data.type;
        var resultCollection = clusterFlag+data.type;
         logger.debug('[Worker '+ process.pid+']: receive data: '+JSON.stringify(data)+' from device: ' +ws.deviceId)
        tasker.updateResult([ws.deviceId],resultCollection,data,wsClientsTaskNumber[ws.deviceId],0)
            .then(function () {
                ws.send('ok')
            })
    }
    //websocket onconnection
    wss.on('connection', function connection(ws, req) {
        onConnectionEvent(ws,req)
        //register on message event, if device return with result
        ws.on('message',function incoming(message) {
            onMessageEvent(ws,message)
        })
        ws.on('close',function () {
            logger.info('[Worker '+ process.pid+']: device: ' + ws.deviceId +' is close !')
            tasker.setDeviceStatus([ws.deviceId], 2,deviceSheet)
        })
        //heart beat
        ws.isAlive = true;
        ws.on('pong', () => {
             logger.debug('[Worker '+ process.pid+']: receive heartbeat from ' +ws.deviceId)
            // tasker.setDeviceStatus([ws.deviceId], 0)
            ws.isAlive = true
        });
    });
    var onOccupied = {
        id:'',
        state: false
    }
    //task interval
    const TaskInterval = setInterval(function () {
        //cluster mode
        if(onOccupied.state){
            logger.info('[Worker '+ process.pid+'] : Worker '+ onOccupied.id + ' is on processing findTasks !')
            return
        }
        if(process.send){
            process.send({id: process.pid, onProcessing: 'findTasks'});
        }
        tasker.findTasks(taskArray).then(function (data) {
            if(data.length <= 0)
                return
            for(let i=0;i<data.length;i++){
                taskDistributor(data[i])
            }
            if(process.send) {
                //send tasks to master
                process.send(data) //cluster mode
                //change state to false
                console.log('[Worker '+ process.pid+']  send msg:' + JSON.stringify(data));
                onOccupied.state = false;
            }

        }).catch(function (err) {
            console.log(err)
        })
    },2000)
    //cluster mode
    process.on('message', function (data) {
        if(data.hasOwnProperty('id')){
            onOccupied.id = data.id;
            onOccupied.state = true;
            return
        }
        if(!data.length)
            return
        console.log('[Worker '+ process.pid+']: received msg:' + JSON.stringify(data));
        for(let i=0;i<data.length;i++){
            taskDistributor(data[i])
        }
    });

    //heartbeat interval
    const heartbeatInterval = setInterval(function ping() {
        wss.clients.forEach(function each(ws) {
            if (ws.isAlive === false){
                logger.info('[Worker '+ process.pid+']: device: ' + ws.deviceId +' is offline !')
                tasker.setDeviceStatus([ws.deviceId], 2, deviceSheet)
                // return ws.terminate();
            }
            ws.isAlive = false;
            ws.ping('', false, true);
        });
    }, 10000);
}

module.exports = wsHandler;