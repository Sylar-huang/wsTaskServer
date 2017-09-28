/***********************************************************
 * 使用方法:                                                
 * 1）参数:mongodb(数据库名)                                
 *     collect(集合名)                                      
 *     whereStr(查询、修改、删除条件 {xxx:'xxx'})             
 *     updateData(修改需要插入的数据{xxx:'xxx'}）            
 *    insertDatas(需要插入的新数据{xxx:'xxx'})               
 *  2)调用页面
 *  var MongodbOperate = require('./mongodbOperate')          
 *  var mongodbTance = new MongodbOperate(mongodb)
 *  为了提高数据库效率，打开以后不再关闭
 ************************************************************/
 
var MongoClient = require('mongodb').MongoClient;

function MongodbOperate (mongodb){
    var DB_CONN_STR = 'mongodb:'+mongodb;
    var _db;
    // console.log('----------------------------')
    this.connect = function () {
        return new Promise(function (resolve, reject) {
            MongoClient.connect(DB_CONN_STR, function (err,db) {
                if(err){
                    reject(err)
                }
                _db = db;
                resolve(db)
            })
        })
    }

    this.query = function(collect,whereStr){
        return new Promise(function(resolve, reject){
            var selectData = function(db, callback) {
                var collection = db.collection(collect);
                collection.find(whereStr).toArray(function(err, result) {
                    if(err)
                    {
                        console.log('Error:'+ err);
                        reject(err);
                    }
                    callback(result);
                });
            }
            if(!_db){
                MongoClient.connect(DB_CONN_STR, function(err, db) {
                    // console.log("查询成功！");
                    selectData(db, function(result) {
                        // console.log(result);
                        _db = db;
                        resolve(result)
                    });
                });
            }else {
                selectData(_db, function (result) {
                    resolve(result)
                });
            }



        })

    },
    this.insert = function(collect,insertDatas){
        return new Promise(function(resolve, reject) {
            var insertData = function (db, callback) {
                var collection = db.collection(collect);
                var data = insertDatas;
                collection.insert(data, function (err, result) {
                    if (err) {
                        console.log('Error:' + err);
                        reject(err);
                    }
                    callback(result);
                });
            }
            if(!_db){
                MongoClient.connect(DB_CONN_STR, function (err, db) {
                    // console.log("插入成功！");
                    insertData(db, function (result) {
                        //console.log(result);
                        _db = db;
                        resolve(result)
                    });
                });
            }else {
                insertData(_db, function (result) {
                    resolve(result)
                });
            }
        })
    },
    this.modify = function(collect,whereStr,updateDataA,flag){
        return new Promise(function(resolve, reject) {
            var updateData = function (db, callback) {
                var collection = db.collection(collect);
                var updateStr = {$set: updateDataA};
                var _whereStr = {};
                var tmpObj = {}
                collection.updateMany(whereStr, updateStr, {w:1}, function (err, result) {
                    if (err) {
                        console.log('Error:' + err);
                        reject(err);
                    }
                    callback(result);
                });
            }
            if(!_db){
                MongoClient.connect(DB_CONN_STR, function (err, db) {
                    // console.log(collect + " "+ JSON.stringify(whereStr) +" 修改成功！");
                    updateData(db, function (result) {
                        _db = db;
                        resolve(result)

                    });
                });
            }else {
                updateData(_db, function (result) {
                    resolve(result)

                });
            }
        })
    },
    this.delete = function(collect,whereStr){
        return new Promise(function(resolve, reject) {
            var delData = function (db, callback) {
                var collection = db.collection(collect);
                collection.remove(whereStr, function (err, result) {
                    if (err) {
                        console.log('Error:' + err);
                        reject(err);
                    }
                    callback(result);
                });
            }
            if(!_db){
                MongoClient.connect(DB_CONN_STR, function (err, db) {
                    console.log("删除成功！");
                    delData(db, function (result) {
                        _db = db;
                        resolve(result)

                    });
                });
            }else {
                delData(_db, function (result) {
                    resolve(result)

                });
            }
        })
  }
}
module.exports = MongodbOperate;
