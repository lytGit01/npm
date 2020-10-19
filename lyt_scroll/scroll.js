/**
 * @fileOverview 滚动组件
 * @author LYT
 * @version 1.0.0
 * @Be careful {
 * 1: 事件监听、移除函数内容必须一致
 * 2：事件监听、移除内部调用函数需将this赋值否则吹出现（this1,this2）函数内容不一致无法移除
 * }
 */
class EventManage {
    constructor () {
        this.handlers = {};
    }
    // 添加监听事件
    on (type, handler) {
        if (!this.handlers[type]) {
            this.handlers[type] = [handler];
            return true; // 避免添加多个事件
        } else {
            this.handlers[type].push(handler);
        }
    }
    // 移除监听事件
    off (type, handler) {
        for (let i = 0; i < this.handlers[type].length; i++) {
            // 内容必须一致
            if (this.handlers[type][i].toString() === handler.toString()) {
                this.handlers[type].splice(i, 1);
            }
        }
    }
}
let EventUtil = {
    addHandler: (obj, type, handler) => {
        if (!obj.customEvent) {
            obj.customEvent = new EventManage();
        }
        const isNewType = obj.customEvent.on(type, handler);
        // 监听事件执行的回调
        const fire = (ev) => {
            for (let i = 0; i < obj.customEvent.handlers[type].length; i++) {
                obj.customEvent.handlers[type][i](ev);
            }
        };
        if (isNewType) {
            if (obj.addEventListener) {
                obj.addEventListener(type, fire, false);
            } else if (obj.attachEvent) {
                obj.attachEvent('on' + type, fire);
            } else {
                obj['on' + type] = fire;
            }
        }
    },
    removeHandler: (obj, type, handler) => {
        if (obj.customEvent) obj.customEvent.off(type, handler);
    },
    getEvent: (event) => {
        return event || window.event;
    },
    getTarget: (event) => {
        return event.target || event.srcElement;
    },
    preventDefault: (event) => {
        if (event.preventDefault) {
            event.preventDefault();
        } else {
            event.returnValue = false;
        }
    },
    stopPropagation: (event) => {
        if (event.stopPropagation) {
            event.stopPropagation();
        } else {
            event.cancelBubble = true;
        }
    },
    getWheelDelta: (event) => {
        if (event.wheelDelta) {
            return event.wheelDelta;
        } else {
            return -event.detail * 40;
        }
    }
};

class ScrollBar {
    constructor (section, article, styleOptions = {}) {
        this.defstyleOptions = {
            opcity: 0.8,
            background: '#ccc'
        };
        Object.assign(this.defstyleOptions, styleOptions);
        this.oSection = document.getElementById(section); // 内容父级
        this.oArticle = document.getElementById(article); // 内容
        this.creatScrollBox();
        // this.oScrollBar = this.oSection.querySelector(scrollBar); // 滚动条父级
        // this.oTip = this.oSection.querySelector(tip); // 滚动条
        this.beforeBoxH = this.oSection.offsetHeight; // 记录盒子高度
        this.beforeContH = this.oArticle.offsetHeight; // 记录内容高度
        this.isScroll = false; // 滚动条是否成功加载(考虑到接口有延迟，初始无内容)
        this.observer = null;
        this.config = { childList: true, subtree: true, attributes: true }; // 监听配置项
        this.basicStyle();
        this.init(); // 初始化
    }
    // 初始化滚动条，内容不够时隐藏滚动条，滚动条按钮长度由内容长度决定
    init () {
        const _this = this;
        // 移除所有事件
        this.removeEvent();
        // 防抖
        const CallbackFun = _this.debounce(_this.isHeightChang, 500);
        // 监听屏幕变化
        EventUtil.addHandler(window, 'resize', CallbackFun);
        if (!this.observer) {
            this.observer = new MutationObserver(() => CallbackFun());
            this.observer.observe(_this.oArticle, _this.config);
        }
        _this.windowInit();
    }
    // 按下滚动条
    Down (ev) {
        const oEvent = EventUtil.getEvent(ev);
        const _this = this;
        this.maxH = this.oScrollBar.offsetHeight - this.oTip.offsetHeight;
        this.disY = oEvent.clientY - this.oTip.offsetTop;
        document.onmousemove = (ev) => {
            _this.fnMove(ev);
            return false;
        };
        document.onmouseup = (ev) => {
            _this.Up(ev);
        };
    }
    // 滚动条移动
    fnMove (ev) {
        const oEvent = EventUtil.getEvent(ev);
        const t = oEvent.clientY - this.disY;
        this.Move(t);
    }
    // 内容滚动
    onMouseWheel (ev) {
        const oEvent = EventUtil.getEvent(ev);
        this.maxH = this.oScrollBar.offsetHeight - this.oTip.offsetHeight;
        // 当前距内容顶端的距离 -  滚动条句可见盒模型的距离
        this.disY = oEvent.clientY - this.oTip.offsetTop;
        if (EventUtil.getWheelDelta(oEvent) > 0) {
            let t = this.oTip.offsetTop - 10;
            this.Move(t);
        } else {
            const t = this.oTip.offsetTop + 10;
            this.Move(t);
        }
        EventUtil.preventDefault(oEvent);
    }
    // 设置内容滚动值
    Move (t) {
        if (t < 0) {
            t = 0;
        } else if (t > this.maxH) {
            t = this.maxH;
        }
        this.oTip.style.top = t + 'px';
        this.contentH = this.oArticle.offsetHeight - this.oSection.offsetHeight;
        this.oArticle.style.top = -this.contentH * this.oTip.offsetTop / this.maxH + 'px';
    }
    // 初始化或屏幕变化
    windowInit () {
        this.oArticle.style.top = '0';
        if (this.oSection.offsetHeight >= this.oArticle.offsetHeight) {
            // 隐藏滚动
            this.setScrollOpcity(0);
        } else {
            // 显示滚动
            this.setScrollOpcity(this.defstyleOptions.opcity);
            this.scrollEvent(); // 添加事件
            this.scrBar(); // 计算滚动条高度
            this.isScroll = true;
        }
    }
    // 内容高度是否有变化
    isHeightChang () {
        if (this.beforeContH !== this.oArticle.offsetHeight || this.beforeBoxH !== this.oSection.offsetHeight) {
            this.beforeBoxH = this.oSection.offsetHeight;
            this.beforeContH = this.oArticle.offsetHeight;
            !this.isScroll && this.windowInit();
            this.isChangConentH();
            this.scrBar();
        }
    }
    // 滚动事件
    scrollEvent () {
        const _this = this;
        // 给需要加按下事件
        EventUtil.addHandler(this.oTip, 'mousedown', (ev) => {
            _this.Down(ev);
        });
        // 给需要加滚动事件的元素加滚动事件
        EventUtil.addHandler(this.oSection, 'mousewheel', (ev) => {
            _this.onMouseWheel(ev);
        }); // ie,chrome
        EventUtil.addHandler(this.oSection, 'DOMMouseScroll', function (ev) {
            _this.onMouseWheel(ev);
        }); // ff
        EventUtil.addHandler(this.oScrollBar, 'mousewheel', (ev) => {
            _this.onMouseWheel(ev);
        }); // ie,chrome
        EventUtil.addHandler(this.oScrollBar, 'DOMMouseScroll', (ev) => {
            _this.onMouseWheel(ev);
        }); // ff
        EventUtil.addHandler(this.oSection, 'mouseover', () => {
            // if (_this.oTip.classList.contains('rollAnimation')) return;
            // _this.oTip.classList.add('rollAnimation');
            _this.oTip.style.opacity = this.defstyleOptions.opcity;
        });
        EventUtil.addHandler(this.oSection, 'mouseleave', () => {
            _this.oTip.style.opacity = 0;
            // if (!_this.oTip.classList.contains('rollAnimation')) return;
            // _this.oTip.classList.remove('rollAnimation');
        });
    }
    // 移除滚动事件
    removeEvent () {
        const _this = this;
        if (_this.observer) {
            _this.observer.disconnect();
        }
        EventUtil.removeHandler(this.oTip, 'mousedown', (ev) => {
            _this.Down(ev);
        });
        // 给需要加滚动事件的元素加滚动事件
        EventUtil.removeHandler(this.oSection, 'mousewheel', (ev) => {
            _this.onMouseWheel(ev);
        }); // ie,chrome
        EventUtil.removeHandler(this.oSection, 'DOMMouseScroll', function (ev) {
            _this.onMouseWheel(ev);
        }); // ff
        EventUtil.removeHandler(this.oScrollBar, 'mousewheel', (ev) => {
            _this.onMouseWheel(ev);
        }); // ie,chrome
        EventUtil.removeHandler(this.oScrollBar, 'DOMMouseScroll', (ev) => {
            _this.onMouseWheel(ev);
        }); // ff
        EventUtil.removeHandler(this.oSection, 'mouseover', () => {
            if (_this.oTip.classList.contains('rollAnimation')) return;
            _this.oTip.classList.add('rollAnimation');
        });
        EventUtil.removeHandler(this.oSection, 'mouseleave', () => {
            if (!_this.oTip.classList.contains('rollAnimation')) return;
            _this.oTip.classList.remove('rollAnimation');
        });
    }
    // 移除监听全屏事件
    removeRestze () {
        const _this = this;
        this.removeEvent();
        EventUtil.removeHandler(window, 'resize', () => {
            _this.windowInit();
        });
    }
    // 移除拖拽滚动条
    Up () {
        document.onmousemove = document.onmouseup = null;
    }
    // 变换内容高度
    isChangConentH () {
        if (this.oArticle.offsetHeight < this.oArticle.offsetTop * -1 + this.oSection.offsetHeight) {
            this.Move(this.maxH);
        }
    }
    // 计算滚动条高度
    scrBar () {
        const proportion = this.oScrollBar.offsetHeight / (this.oArticle.offsetHeight - this.oSection.offsetHeight);
        let scorBarH;
        if (proportion > 1) {
            scorBarH = this.oScrollBar.offsetHeight * 3 / 4;
        } else {
            scorBarH = Math.ceil((this.oSection.offsetHeight * 4 / 5) * proportion);
        }
        this.oTip.style.height = scorBarH + 'px';
    }
    // 触发多次解决方法[防抖]
    debounce (func, threshold, execAsap) {
        let timeout;
        let _this = this;
        return function debounced () {
            let args = arguments;
            function delayed () {
                if (!execAsap) {
                    func.apply(_this, args);
                }
                timeout = null;
            };
            if (timeout) { clearTimeout(timeout); } else if (execAsap) { func.apply(_this, args); }
            timeout = setTimeout(delayed, threshold || 100);
        };
    }
    // 设置滚动条透明度
    setScrollOpcity (num) {
        this.oScrollBar.style.opacity = num;
    }
    // 创建滚动条盒子
    creatScrollBox () {
        this.oScrollBar = document.createElement('div');
        this.oTip = document.createElement('p');
        this.oScrollBar.appendChild(this.oTip);
        this.oScrollBar.style.cssText = 'position:absolute;top:0;right:0;height:100%;width:6px;background:transparent;margin: 0 !important;';
        this.oTip.style.cssText = 'position:absolute;' +
            'top:0;' +
            'left:0;' +
            'background:' + this.defstyleOptions.background +';' +
            'width:6px;' +
            'min-height:20px;' +
            'cursor:pointer;' +
            'border-radius: 4px;' +
            'opacity: 0;' +
            'transition: opacity .12s ease-out;' +
            'margin: 0 !important;';
        this.oSection.appendChild(this.oScrollBar);
    }
    // 基本样式
    basicStyle () {
        this.oSection.style.cssText = 'position: relative; overflow: hidden;';
        this.oArticle.style.cssText = 'width: 100%; position: absolute; margin: 0;';
        this.oTip.style.background = this.defstyleOptions.background;
    }
}

// export default ScrollBar;
