const getPageClass = (() => {
    let cache;
    const urlToPageDictionary = {
        '/goodbye.jsp': 'LogoutPage',
        '/printDetail.do': 'PrintDetailPage',
        '/printList.do': 'PrintListPage',
        '/list.do': 'ListPage',
        '/detail.do': 'DetailPage'
    };
    return () => {
        if (cache) {
            return cache;
        }
        let page = 'other';
        if (location.origin === 'https://smweb.telekom.de' ||
            location.origin === 'http://smweb-sit.telekom.de') {
            if (location.pathname.endsWith('/index.do')) {
                const hasLogin = document.querySelector('.login-container');
                page = hasLogin ? 'LoginPage' : 'MainPage';
            }
            else {
                for (const url in urlToPageDictionary) {
                    if (location.pathname.endsWith(url)) {
                        page = urlToPageDictionary[url];
                        break;
                    }
                }
            }
            if (page === 'other') {
                page = window === top ? 'topPage' : 'framePage';
            }
        }
        cache = page;
        return cache;
    };
})();
function run(script) {
    if (typeof script !== 'function' && typeof script !== 'string') {
        console.error('Parameter is not a function or string: ', script);
        console.error(new Error().stack);
        return;
    }
    if (typeof script === 'function') {
        script = `(${script.toString()})()`;
    }
    const el = document.createElement('script');
    if (script.endsWith('.js')) {
        el.src = chrome.runtime.getURL(script);
    }
    else {
        el.textContent = script;
    }
    const documentElement = document.documentElement;
    documentElement.insertBefore(el, documentElement.firstChild);
    el.remove();
}
function runScript(scripts) {
    if (Array.isArray(scripts)) {
        for (const script of scripts) {
            runScript(script);
        }
    }
    else if (scripts) {
        run(scripts);
    }
}
function injectPlugins() {
    runScript([
        plugins.get(getPageClass() + '-' + document.readyState),
        plugins.get('all' + '-' + document.readyState)
    ]);
}
injectPlugins();
document.addEventListener('readystatechange', injectPlugins);
