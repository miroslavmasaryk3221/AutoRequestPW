var storage = {
    getValue: function (key, defaultValue) {
        var value = localStorage[key];
        if (!value) return defaultValue;
        return value;
    },

    setValue: function (key, value) {
        if (!localStorage) {
            return;
        }
        localStorage[key] = value;
    }
};