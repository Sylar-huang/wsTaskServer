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
/**
 * File Created by Lenovo at 2017/8/16.
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
 * @author Sylarhuang
 * @date 2017/8/16
 * @version 1.2
 */

var path = require('path');
var debuglevel = 'error';
var clusterMode = false;
var port = 8081
var developMode = false;
process.argv.forEach(function (val, index, array) {
    array.forEach(function (item) {
        if(item.indexOf('debug-level')!=-1){
            debuglevel = item.split('=')[1];
        }
        if(item.indexOf('clusterMode')!=-1){
            clusterMode = item.split('=')[1];;
        }
        if(item.indexOf('port')!=-1){
            port = parseInt(item.split('=')[1]);
        }
        if(item.indexOf('developMode')!=-1){
            developMode = true;
        }
    })

});





//import log4j module
const log4js = require('log4js');
var loggerFileName = 'logs/wsServer-'+process.pid + '-server.log'

log4js.configure({
    appenders: {
        wsServer: { type: 'dateFile',pattern: '-yyyy-MM-dd.log', alwaysIncludePattern: true,filename: loggerFileName,replaceConsole: true } ,
        wsConsole: { type: 'console' }

    },
    categories: { default: { appenders: ['wsServer','wsConsole'], level:debuglevel } },

});


const logger = log4js.getLogger('wsServer');

var wsHandler = require('./wshandler2')
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
var wshandle;

if (cluster.isMaster && clusterMode) {
    // Fork workers.
    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
    cluster
    function eachWorker(callback) {
        for (var id in cluster.workers) {
            callback(cluster.workers[id]);
        }
    }
    Object.keys(cluster.workers).forEach(function (id) {
        cluster.workers[id].on('message', function (msg) {
            // console.log('[master] ' + 'received task:' + JSON.stringify(msg) + 'from worker' + id);
            if(msg.hasOwnProperty('topic'))
                return
            logger.debug('[master] ' + 'received message:' + JSON.stringify(msg) + 'from worker' + id );
                eachWorker(function (worker) {
                    if(worker != cluster.workers[id])
                        worker.send(msg);
                });
        });
    });


} else {
    wshandle = new wsHandler(port,logger, process,developMode)
    console.log(`Worker ${process.pid} started`);
}
// else if(!clusterMode)
//     wshandle = new wsHandler(8080,logger, process)
process.on('uncaughtException', function (err) {
    console.error('An uncaught error occurred!');
    console.error(err.stack);
});