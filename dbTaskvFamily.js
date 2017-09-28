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
var mongodb = '//172.23.31.73:27017/osgifamilya'
var mongodbTance = new MongodbOperate(mongodb)
var deviceSheet = 'osgidevices';
function dbTaskfamiliy(logger) {
    this.findDeviceInfo = function (deviceList) {
        var search = {}
        if (deviceList.length != 0) {
            search = {deviceId: {$in: deviceList}}
        }
        return mongodbTance.query(deviceSheet, search)
    }

}
module.exports = dbTaskfamiliy;