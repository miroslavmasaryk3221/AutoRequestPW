function noPopup() {
    window.open = new Proxy(window.open, {
        apply: function (target, thisArg, args) {
            return Reflect.apply(target, thisArg, args.slice(0, 2));
        }
    });
}
addPlugin('DetailPage', 'interactive', noPopup);
addPlugin('ListPage', 'interactive', noPopup);
addPlugin('MainPage', 'interactive', function () {
    Ext.ComponentMgr.onAvailable('cwcMastHead', function (cwcMastHead) {
        cwcMastHead.initialConfig.height = '34px';
        cwcMastHead.setHeight('34px');
    });
});
addPlugin('MainPage', 'complete', function () {
    var _a, _b;
    (_b = (_a = Ext === null || Ext === void 0 ? void 0 : Ext.util) === null || _a === void 0 ? void 0 : _a.Cookies) === null || _b === void 0 ? void 0 : _b.set('pagesize', 2000);
    if (top.tpzRefresh) {
        setInterval(() => top.tpzRefresh(true), 60000);
    }
});
