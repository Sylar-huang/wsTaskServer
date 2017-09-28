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
var NodeUglifier = require("node-uglifier");

var exportDir="dist/lib_test_project_export/";
var mainFile="wserver-http-tea-modulize-ws.js";


var nodeUglifier = new NodeUglifier(mainFile);
nodeUglifier.merge().uglify();

//exporting
nodeUglifier.exportDependencies(exportDir)
nodeUglifier.exportToFile("dist/wserver-http-tea-modulize-ws-cluster-ugl.js");
nodeUglifier.exportSourceMaps("dist/sourcemaps/wserver-http-tea-modulize-ws-cluster-ugl.js");