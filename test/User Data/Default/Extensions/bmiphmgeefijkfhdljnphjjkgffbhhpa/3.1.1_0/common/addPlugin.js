const plugins = new Map();
function addPlugin(page, state, func) {
    const key = page + '-' + state;
    let scripts = plugins.get(key);
    if (!scripts)
        scripts = plugins.set(key, []).get(key);
    scripts.push(func);
}
