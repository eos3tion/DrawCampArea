"use strict";
const AreaDict = {
    /**
     * DEMO使用固定 3*3 固定宽高
     * ```js
     * [
     *  [-1,-1],[ 0,-1],[ 1,-1],
     *  [-1, 0],[ 0, 0],[ 1, 0],
     *  [-1, 1],[ 0, 1],[ 1, 1]
     * ]
     * ```
     */
    [0 /* Area3_3 */]: [-1, 1],
    [1 /* Area5_5 */]: [-2, 2]
};
const DemoCampColor = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
function createSampleFlagPoints() {
    let time = 0;
    let count = 100000;
    let sampleFlagPoints = [];
    while (count--) {
        sampleFlagPoints.push(getDemoFlagPoint());
    }
    return sampleFlagPoints;
    function getDemoFlagPoint() {
        return {
            areaType: 1 /* Area5_5 */,
            time: time++,
            x: Math.random() * 1200 /* Columns */ >> 0,
            y: Math.random() * 1200 /* Rows */ >> 0,
            camp: DemoCampColor.length * Math.random() >> 0
        };
    }
}
/**
 * 根据采样数据，绘制阵营占位图
 */
function createAreaMaps(samplePoints) {
    samplePoints.sort((a, b) => a.time - b.time);
    let map = new Uint8Array(1200 /* Columns */ * 1200 /* Rows */);
    //根据采样的旗点，填充区域图
    for (let i = 0; i < samplePoints.length; i++) {
        const { areaType, x, y, camp } = samplePoints[i];
        let [min, max] = AreaDict[areaType];
        for (let ox = min; ox <= max; ox++) {
            for (let oy = min; oy <= max; oy++) {
                let ax = ox + x;
                let ay = oy + y;
                let idx = getIdx(ax, ay);
                let c = map[idx];
                if (c === 0) {
                    map[idx] = camp;
                }
            }
        }
    }
    return map;
}
/**
 * 阵营展位图转为王氏Tile的阵营占位数据
 * @param map
 */
function map2WangTileData(map) {
    const wangTilesData = new Uint8Array(1200 /* Columns */ * 1200 /* Rows */);
    //区域填充完毕
    //做`WangTile`检查    
    for (let y = 0; y < 1200 /* Rows */; y++) {
        for (let x = 0; x < 1200 /* Columns */; x++) {
            wangTilesData[getIdx(x, y)] = getStyle(map, x, y);
        }
    }
    return wangTilesData;
}
// /**
//  * 阵营展位图转为王氏Tile的阵营占位数据
//  * Inline版，减少循环中的函数调用
//  * @param map 
//  */
// function map2WangTileDataInline(map: Uint8Array) {
//     const wangTilesData = new Uint8Array(Const.Columns * Const.Rows);
//     //区域填充完毕
//     //做`WangTile`检查    
//     for (let y = 0; y < Const.Rows; y++) {
//         let row = y * Const.Columns;
//         let row1 = row + Const.Columns;
//         let row_1 = row - Const.Columns;
//         for (let x = 0; x < Const.Columns; x++) {
//             let idx = row + x;
//             const v = map[idx];
//             if (v !== 0) {
//                 const x1 = x + 1;
//                 const x_1 = x - 1;
//                 const northEast = map[row_1 + x1] === v ? 1 : 0;
//                 const southEast = map[row1 + x1] === v ? 2 : 0;
//                 const southWest = map[row1 + x_1] === v ? 4 : 0;
//                 const northWest = map[row_1 + x_1] === v ? 8 : 0;
//                 wangTilesData[idx] = v << 4 | northEast | southEast | southWest | northWest;
//             }
//         }
//     }
//     return wangTilesData;
// }
/**
 * 参考地址： http://www.cr31.co.uk/stagecast/wang/intro.html
 */
function getStyle(map, x, y) {
    let v = getMapCamp(map, x, y);
    if (v !== 0) {
        let style = getTexStyle(map, v, x, y);
        if (style === 15 /* FullMask */) {
            v = 0;
        }
        else {
            v = (v << 4) | style;
        }
    }
    return v;
}
function getTexStyle(map, v, x, y) {
    const north = getMapCamp(map, x, y - 1) === v ? 1 : 0;
    const east = getMapCamp(map, x + 1, y) === v ? 2 : 0;
    const south = getMapCamp(map, x, y + 1) === v ? 4 : 0;
    const west = getMapCamp(map, x - 1, y) === v ? 8 : 0;
    return north | east | south | west;
}
function getMapCamp(map, x, y) {
    return map[getIdx(x, y)];
}
function getIdx(x, y) {
    return y * 1200 /* Columns */ + x;
}
function benchmark() {
    console.time("sample");
    let points = createSampleFlagPoints();
    console.timeEnd("sample");
    console.time("map");
    let campArea = createAreaMaps(points);
    console.timeEnd("map");
    console.time("wangTile");
    map2WangTileData(campArea);
    console.timeEnd("wangTile");
    // console.time("wangTile2");
    // map2WangTileDataInline(campArea);
    // console.timeEnd("wangTile2");
}
egret.ImageLoader.crossOrigin = "anonymous";
let useWangData = true;
window["EgretEntry"] = class extends egret.Sprite {
    constructor() {
        super();
        this.on("addedToStage" /* ADDED_TO_STAGE */, onStage);
        const points = createSampleFlagPoints();
        const campArea = createAreaMaps(points);
        const wangTileData = map2WangTileData(campArea);
        const mapWidth = 100 /* AreaWidth */ * 1200 /* Columns */;
        const mapHeight = 100 /* AreaHeight */ * 1200 /* Rows */;
        const imgs = [];
        /**
         * 当前屏幕坐标
         */
        let vx = 0;
        let vy = 0;
        function onStage() {
            let stage = egret.sys.$TempStage;
            initController(stage);
            setViewPos(0, 0);
        }
        function setViewPos(x, y) {
            let stage = egret.sys.$TempStage;
            let { stageWidth, stageHeight } = stage;
            if (x < 0) {
                x = 0;
            }
            let right = mapWidth - stageWidth;
            if (x > right) {
                x = right;
            }
            if (y < 0) {
                y = 0;
            }
            let bottom = mapHeight - stageHeight;
            if (y > bottom) {
                y = bottom;
            }
            vx = x;
            vy = y;
            let sx = Math.floor(x / 100 /* AreaWidth */);
            let sy = Math.floor(y / 100 /* AreaHeight */);
            let ex = Math.ceil((x + stageWidth) / 100 /* AreaWidth */);
            let ey = Math.ceil((y + stageHeight) / 100 /* AreaHeight */);
            if (useWangData) {
                drawScreenWithWangTileData(sx, sy, ex, ey, stage);
            }
            else {
                drawScreenWithRawData(sx, sy, ex, ey, stage);
            }
        }
        function initController(stage) {
            stage.on("touchBegin" /* TOUCH_BEGIN */, touchBegin);
            function touchBegin(e) {
                let sx = e.stageX;
                let sy = e.stageY;
                let svx = vx;
                let svy = vy;
                stage.on("touchMove" /* TOUCH_MOVE */, onMove);
                stage.on("touchEnd" /* TOUCH_END */, touchEnd);
                function onMove(e) {
                    let cx = e.stageX;
                    let cy = e.stageY;
                    let dx = cx - sx;
                    let dy = cy - sy;
                    setViewPos(svx - dx, svy - dy);
                }
                function touchEnd(e) {
                    stage.off("touchMove" /* TOUCH_MOVE */, touchBegin);
                    stage.off("touchEnd" /* TOUCH_END */, touchEnd);
                    onMove(e);
                }
            }
        }
        /**
         * 使用处理后的王氏数据绘制屏幕内容
         * @param startX
         * @param startY
         */
        function drawScreenWithWangTileData(startX, startY, endX, endY, con) {
            let i = 0;
            for (let y = startY; y <= endY; y++) {
                let oy = y * 100 /* AreaHeight */ - vy;
                for (let x = startX; x <= endX; x++) {
                    let wang = wangTileData[getIdx(x, y)];
                    if (wang !== 0) {
                        let style = wang & 15 /* FullMask */;
                        let camp = wang >> 4;
                        let image = imgs[i];
                        if (!image) {
                            imgs[i] = image = getImage();
                        }
                        image.tint = DemoCampColor[camp];
                        image.source = `assets/${style}.png`;
                        image.x = x * 100 /* AreaWidth */ - vx;
                        image.y = oy;
                        i++;
                        if (!image.stage) {
                            con.addChild(image);
                        }
                    }
                }
            }
            for (; i < imgs.length; i++) {
                jy.removeDisplay(imgs[i]);
            }
        }
        function drawScreenWithRawData(startX, startY, endX, endY, con) {
            let i = 0;
            for (let y = startY; y <= endY; y++) {
                let oy = y * 100 /* AreaHeight */ - vy;
                for (let x = startX; x <= endX; x++) {
                    let camp = getMapCamp(campArea, x, y);
                    if (camp) {
                        let style = getTexStyle(campArea, camp, x, y);
                        if (style != 15 /* FullMask */) {
                            let image = imgs[i];
                            if (!image) {
                                imgs[i] = image = getImage();
                            }
                            image.tint = DemoCampColor[camp];
                            image.source = `assets/${style}.png`;
                            image.x = x * 100 /* AreaWidth */ - vx;
                            image.y = oy;
                            i++;
                            if (!image.stage) {
                                con.addChild(image);
                            }
                        }
                    }
                }
            }
            for (; i < imgs.length; i++) {
                jy.removeDisplay(imgs[i]);
            }
        }
        function getImage() {
            let image = new jy.Image();
            image.width = 100 /* AreaWidth */;
            image.height = 100 /* AreaHeight */;
            return image;
        }
    }
};
egret.runEgret({ renderMode: "webgl" });
