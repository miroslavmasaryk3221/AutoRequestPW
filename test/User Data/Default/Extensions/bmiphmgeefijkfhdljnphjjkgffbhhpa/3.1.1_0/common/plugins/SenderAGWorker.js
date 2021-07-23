/**
 *  The activities log of an incident can be very long.
 *  To find which assignment group the incident came from we have to traverse the list.
 *  This operation can be time intensive, in our test tickets it can take 4-6 seconds with a 500+ record log
 *  This was blocking the UI, delaying the opening of the Ticket Actions dropdown which causes a negative user experience.
 *  To remedy this the search operation is delegated to a WebWorker.
 *
 *  The main thread and the worker communicate via 'request' and 'result' messages.
 */
addPlugin('MainPage', 'loading', function () {
    function SenderAGWorker() {
        const _this = this;
        let receivedMessage;

        // Send a message to the main thread to invoke SMweb.getFieldValue and wait for its return value
        function getFieldValue (args) {
            if (!Array.isArray(args)) {
                args = [args];
            }
            postMessage({
                type: 'request',
                value: 'getFieldValue',
                args: args
            });

            return new Promise(function (resolve, reject) {
                var retryCount = 0;
                (function retry() {
                    try {
                        const result = receivedMessage;
                        if (result && result.value !== undefined) {
                            receivedMessage = undefined;
                            resolve(result.value);
                        } else if (retryCount < 100) { // Arbitrary retry limit to avoid infinite looping
                            retryCount++;
                            setTimeout(retry, 5);
                        }
                    } catch (err) {
                        reject(new Error(err));
                    }
                })();
            });
        }

        // Find the sender AG
        _this.onmessage = async function (message) {
            const data = message.data;
            if (data.type === 'request') {
                let imSender = '';
                let index = 1;
                let activityType;
                const imAssignment = await getFieldValue('instance/assignment');
                const regGroups = new RegExp('Reassignment from (\\S+) to (\\S+)');
                do {
                    activityType = await getFieldValue('references/model[@id=\'number.vj\']/instance[' + index + ']/type');
                    if (activityType === 'Reassignment') {
                        const activityDescription = await getFieldValue('references/model[@id=\'number.vj\']/instance[' + index + ']/description/description[1]');

                        const [, fromAG, toAG] = activityDescription.match(regGroups) || [];
                        if (toAG === imAssignment && !imSender) imSender = fromAG;
                    }
                    index++;
                } while (activityType && !imSender);


                postMessage({
                    type: 'result',
                    value: imSender
                });
            } else if (data.type === 'result') {
                receivedMessage = data;
            }
        };
    }

    document.documentElement.addEventListener('hpsmPageLoad', function (ev) {
        const win = ev.detail.window;
        delete win.senderAG;

        if (SMweb.isIncidentPage() && SMweb.isDetailOrListDetailPage()) {
            // https://stackoverflow.com/a/37722835 - workaround to make workers work from a chrome extension
            var worker = new Worker(URL.createObjectURL(new Blob(['(' + SenderAGWorker.toString() + ')()'], {
                type: 'text/javascript'
            })));

            worker.postMessage({
                type: 'request'
            });

            worker.onmessage = async function (message) {
                const data = message.data;
                // Requests from the worker invoke a SMweb function
                // Because they are not available in the worker's scope
                if (data.type === 'request') {
                    const func = SMweb[data.value];
                    if (func && typeof func === 'function') {
                        data.args.push(null);
                        data.args.push(win);

                        let result = null;
                        try {
                            result = await SMweb.waitUntil(func.bind.apply(func, [null].concat(data.args)), 100);
                        } catch (err) {}

                        worker.postMessage({
                            type: 'result',
                            value: result
                        });
                    }
                } else if (data.type === 'result') {
                    // Actions.js will pick up the senderAG value from here
                    win.senderAG = data.value;
                }
            };
        }
    });
});
