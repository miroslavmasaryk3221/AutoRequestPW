/**
 * Window masking event dispatcher
 */
addPlugin('MainPage', 'loading', function() {
    window.jsDebug = true;

    window.cwc = window.cwc || {};

    const traceFuncVar = function(obj, prop, tracer) {
        let value;
        Object.defineProperty(obj, prop, {
            get: function() {
                tracer('get', value);
                return value;
            },
            set: function(newValue) {
                tracer('set', newValue);
                value = (typeof newValue !== 'function') ? newValue : function(...args) {
                    const res = newValue.apply(obj, args);
                    tracer('run', args, res);
                    return res;
                };
            },
        });
    };

    /* traceFuncVar(cwc, "messageBoxShown", (op, val) => { // This contained no operations
        if (op === "set") {
            if (val === true){
                // top.document.documentElement.dispatchEvent(new Event('messageBoxShown'));
            } // else dispatch messageBoxHidden? not needed yet
        }
    }); */

    traceFuncVar(cwc, 'showMessage', (op, args) => {
        if (op === 'run') {
            top.document.documentElement.dispatchEvent(new CustomEvent('showMessage', {
                detail: {
                    type: args[0],
                    message: args[1],
                    title: args[3],
                    buttons: args[4]
                }
            }));
        }
    });

    /* traceFuncVar(cwc, 'maskId', (op, val) => {
        if (op === 'set') {
            console.log("cwc.maskId, set:", val);
        }
    }); */

    traceFuncVar(cwc, 'maskWindow', (op) => {
        // console.log('maskWindow');
        if (op === 'run') {
            top.document.documentElement.dispatchEvent(new Event('maskWindow'));
        }
    });

    // cwc-Extjs-All.js 2017: cwc.unmaskWindow = function(){ ...

    traceFuncVar(cwc, 'unmaskWindow', (op) => {
        // console.log('unmaskWindow');
        if (op === 'run') {
            top.document.documentElement.dispatchEvent(new Event('unmaskWindow'));
        }
    });

    traceFuncVar(cwc, 'forceUnmaskWindow', (op) => {
        // console.log('forceUnmaskWindow');
        if (op === 'run') {
            top.window.requestAnimationFrame(() => top.document.documentElement.dispatchEvent(new Event('forceUnmaskWindow')));
        }
    });

});


/**
 * HPSM page event dispatcher
 */
addPlugin('all', 'loading', function() {
    document.addEventListener('keydown', function(ev) {
        // Enables page refresh with F5 key by preventing key interruption
        if (event.key === 'F5') {
            event.stopImmediatePropagation();
            return;
        }

        // Select all
        if (ev.ctrlKey && String.fromCharCode(ev.which || ev.keyCode).toUpperCase() == 'A') {
            const sel = top.window.getSelection();

            if (sel.rangeCount > 0 && !sel.isCollapsed) {
                sel.empty();
                ev.preventDefault();
            }
        }
    });

    const traceFuncVar = function(obj, prop, tracer) {
        let value;
        Object.defineProperty(obj, prop, {
            enumerable: true,
            configurable: true,
            get: function() {
                tracer('get', value);
                return value;
            },
            set: function(newValue) {
                tracer('set', newValue);
                value = (typeof newValue !== 'function') ?
                    newValue :
                    function(...args) {
                        const result = newValue.apply(this, args);
                        tracer('run', args, result);
                        return result;
                    };
            },
        });
    };

    window.hpsm = window.hpsm || {};

    traceFuncVar(hpsm, 'onPageLoad', (op) => {
        if (op === 'run') {
            top.document.documentElement.dispatchEvent(new CustomEvent('hpsmPageLoad', {
                detail: {
                    window: window
                }
            }));
        }
    });

    traceFuncVar(hpsm, 'onDetailActivate', (op) => {
        if (op === 'run') {
            top.document.documentElement.dispatchEvent(new CustomEvent('hpsmDetailActivate', {
                detail: null
            }));
        }
    });

    traceFuncVar(hpsm, 'onListActivate', (op) => {
        if (op === 'run') {
            top.document.documentElement.dispatchEvent(new CustomEvent('hpsmListActivate', {
                detail: null
            }));
        }
    });

    traceFuncVar(hpsm, 'resizeRecordList', (op) => {
        if (op === 'run') {
            top.document.documentElement.dispatchEvent(new CustomEvent('hpsmResizeRecordList', {
                detail: null
            }));
        }
    });

    traceFuncVar(hpsm, 'initRecordList', (op) => {
        if (op === 'run') {
            top.document.documentElement.dispatchEvent(new CustomEvent('hpsmInitRecordList', {
                detail: null
            }));
        }
    });

    const traceProp = function(name, obj, prop) {
        var value = obj[prop];
        var getter = function() {
            return value;
        };
        var setter = function(newval) {

            top.document.documentElement.dispatchEvent(new CustomEvent(name + '.' + prop, {
                detail: {
                    op: 'set',
                    oldVal: value,
                    newVal: newval
                }
            }));
            return (value = newval);
        };
        var runner = function(...args) {
            return value.apply(obj, args);
        };

        if (delete obj[prop]) {
            if (typeof value === 'function') {
                obj[prop] = runner;
            } else {
                Object.defineProperty(obj, prop, {
                    get: getter,
                    set: setter,
                    enumerable: true,
                    configurable: true
                });
            }
        }
    };

    window.hpsm = window.hpsm || {};
    window.hpsm.ux = window.hpsm.ux || {};
    window.hpsm.Table = window.hpsm.Table || {};

    hpsm.Table.magnifyWin = hpsm.Table.magnifyWin || null;
    traceProp('hpsm.Table', window.hpsm.Table, 'magnifyWin');

    window.cwc = window.cwc || {};
});

/**
 * Notebook tab selection event dispatcher
 */
addPlugin('DetailPage', 'complete', function() {
    if (hpsm && hpsm.notebook && hpsm.notebook.setSelected) {
        const originalFunction = hpsm.notebook.setSelected;

        hpsm.notebook.setSelected = function() {
            originalFunction.apply(this, arguments);
            top.document.documentElement.dispatchEvent(new CustomEvent('hpsmNotebookTabSelected', {
                detail: null //feel free to add data here if needed
            }));
        };
    }
});
