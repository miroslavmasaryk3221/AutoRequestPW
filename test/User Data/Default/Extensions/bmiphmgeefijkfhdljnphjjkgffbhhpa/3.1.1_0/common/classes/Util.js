class Util {
    static get(elem, selector) {
        if (typeof elem === 'string') {
            return document.querySelector(elem);
        }
        else {
            return elem.querySelector(selector);
        }
    }
    static getAll(elem, selector) {
        let nodeList;
        if (typeof elem === 'string') {
            nodeList = document.querySelectorAll(elem);
        }
        else {
            nodeList = elem.querySelectorAll(selector);
        }
        return Array.from(nodeList);
    }
    static getAllInputs(context) {
        if (context === undefined) {
            return Util.getAll('input');
        }
        else {
            return Util.getAll(context, 'input');
        }
    }
    static getInput(selector) {
        return Util.get(`${selector} input`);
    }
    static hasProp(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    }
    static boolSort(array, trueFirst, ...properties) {
        if (properties.length === 0) {
            return array;
        }
        const property = properties.splice(0, 1)[0];
        return [
            ...Util.boolSort([...array.filter(elem => !!elem[property] === trueFirst)], trueFirst, ...properties),
            ...Util.boolSort([...array.filter(elem => !!elem[property] !== trueFirst)], trueFirst, ...properties)
        ];
    }
    static delay(ms) {
        return new Promise(resolve => setTimeout(() => resolve(), ms));
    }
}
