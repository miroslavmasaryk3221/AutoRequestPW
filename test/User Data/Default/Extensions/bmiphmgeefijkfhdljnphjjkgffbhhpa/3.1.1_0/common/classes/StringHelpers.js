class StringHelpers {
    static splitAtFirstMatch(string, toFind) {
        const index = string.toLowerCase().indexOf(toFind.toLowerCase());
        const length = toFind.length;
        return [string.substring(0, index), string.substring(index + length)];
    }
    static findInStringSingle(string, toFind) {
        const matches = [];
        const stringWords = string.toLowerCase().split(' ');
        for (let i = 0; i < stringWords.length; i++) {
            const index = stringWords[i].indexOf(toFind);
            if (index !== -1) {
                matches.push({
                    string: string,
                    atChar: index,
                    atWord: i,
                    multi: false
                });
            }
        }
        return matches;
    }
    static findInStringMulti(string, toFind) {
        const matches = [];
        const index = string.toLowerCase().indexOf(toFind);
        if (string.toLowerCase().indexOf(toFind) !== -1) {
            matches.push({
                string: string,
                atChar: index,
                atWord: 0,
                multi: true
            });
        }
        return matches;
    }
    static findInString(string, toFind) {
        const matches = [];
        toFind = toFind.toLowerCase();
        matches.push(...this.findInStringSingle(string, toFind));
        matches.push(...this.findInStringMulti(string, toFind));
        return matches;
    }
    static sortStringMatches(matches) {
        matches.sort((a, b) => {
            if (a.multi !== b.multi) {
                return a.multi > b.multi ? 1 : -1;
            }
            else {
                if (a.atChar !== b.atChar) {
                    return a.atChar > b.atChar ? 1 : -1;
                }
                else {
                    if (a.atWord !== b.atWord) {
                        return a.atWord > b.atWord ? 1 : -1;
                    }
                    else {
                        const aString = a.string.toLowerCase();
                        const bString = b.string.toLowerCase();
                        return aString > bString ? 1 : -1;
                    }
                }
            }
        });
    }
    static searchStringArray(resultList, toFind) {
        if (!toFind)
            return resultList;
        const matches = [];
        if (toFind.length) {
            toFind = toFind.toLowerCase();
            for (const result of resultList) {
                matches.push(...this.findInString(result, toFind));
            }
            if (matches.length) {
                this.sortStringMatches(matches);
            }
        }
        return Array.from(new Set(matches.map(match => match.string)));
    }
}
