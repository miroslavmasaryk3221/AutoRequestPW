/**
 * List exporter handling
 */
addPlugin('MainPage', 'loading', function() {
    const reportType = {
        'probsummary': 'Incident',
        'cm3r': 'Change',
        'cm3t': 'change Task',
        'incidents': 'Interaction',
        'rootcause': 'Problem',
        'rootcausetask': 'Problem Task',
        'Todo': 'To Do'
        //"tsiarchiverootcause": "Archived Problem"
    };

    const addExportButtons = async function () {
        if (!SMweb.isListOrListDetailPage()) {
            return;
        }
        const tab = cwc.getActiveTab();
        const dt = tab.dataStore.displayType;
        const frame = dt === 'list' ? tab.getFrameWindow() : tab.getListFrameWindow();
        // SM9 bug: When refreshed on listdetail view, the list does not appear
        // If !frame this probably happened and there's no list to export 
        if (!frame) {
            return;
        }

        const toolbar = dt === 'list' ? tab.getMIF().getTopToolbar() : tab.getListFrame().getTopToolbar();

        if (!frame.listConfig.groupedBy && toolbar && toolbar.items && toolbar.items.items) {
            let exportButton = toolbar.items.items.find(button => button.iconCls === 'list-export-csv');
            let exportAllButton = toolbar.items.items.find(button => button.iconCls === 'list-export-csv-multi');

            if (!exportButton) {
                exportButton = toolbar.addButton({
                    cls: 'export-list-csv x-btn-icon cwc-toolbar-icononly-button cwc-toolbar-button',
                    iconCls: 'list-export-csv',
                    tooltip: 'Download page as CSV',
                    handler: async function () {
                        exportAsCsv(getCurrentPageData(), getReportFilename());
                    }
                });
            }
            if (!exportAllButton) {
                let nextPage, prevPage;
                try {
                    //need to wait a few hundred ms for the elements to load
                    await SMweb.waitUntil(function () {
                        nextPage = frame.document.getElementsByClassName('x-tbar-page-next')[0];
                        prevPage = frame.document.getElementsByClassName('x-tbar-page-prev')[0];
                        return nextPage && prevPage;
                    }, 3000);
                } catch (err) {
                    toolbar.doLayout();
                    return;
                }
                if (nextPage.getAttribute('aria-disabled') === 'false' || prevPage.getAttribute('aria-disabled') === 'false') {
                    exportAllButton = toolbar.addButton({
                        cls: 'export-list-csv x-btn-icon cwc-toolbar-icononly-button cwc-toolbar-button',
                        iconCls: 'list-export-csv-multi',
                        tooltip: 'Download all pages as CSV',
                        handler: async function () {
                            const data = await getAllPagesData();
                            exportAsCsv(data, getReportFilename());
                        }
                    });
                }
            }
            toolbar.doLayout();
        }
    };

    const decodeHTML = function (string) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = string;
        return textarea.value;
    };

    const moveToPage = function (pageNumber, recordList) {
        if (!recordList) {
            const frame = getListFrame();
            recordList = frame.Ext.getCmp('recordListGrid');
        }
        recordList.moveTo(pageNumber);

        return SMweb.waitForEvent('forceUnmaskWindow');
    };

    const exportAsCsv = function (data, filename) {
        const csv = data.reduce(function (accumulator, currentRow) {
            return accumulator + currentRow.map(cell => '"' + cell.replace('"', '""') + '"').join(',') + '\r\n';
        }, '');
        //Download; \ufeff is needed for correct character display in Excel
        const blob = new Blob(['\ufeff', decodeHTML(csv)], {
            type: 'text/csv;charset=UTF-8'
        });

        const a = document.createElement('a');
        a.href = window.URL.createObjectURL(blob);
        a.download = filename;

        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

    };

    const getListFrame = function () {
        const tab = cwc.getActiveTab();
        const dt = tab.dataStore.displayType;
        return dt === 'list' ? tab.getFrameWindow() : dt === 'listdetail' ? tab.getListFrameWindow() : null;
    };

    const getReportFilename = function (frame = getListFrame()) {
        const tableName = frame.listConfig.tableName;
        const type = reportType[tableName] || 'Archived ' + reportType[tableName.replace('tsiarchive', '')];
        return type + ' Report.csv';
    };

    const getTableHeader = function (frame = getListFrame()) {
        return frame.listConfig.columns.filter(col => col.dataIndex);
    };

    const getCurrentPageData = function (header = getTableHeader(), includeHeader = true) {
        const result = [];
        if (includeHeader) {
            result.push(header.map(col => col.caption));
        }
        SMweb.getRecordListData().forEach(function (record) {
            const resultRow = [];
            //reorder fields to match the list in SM9
            header.forEach(function (col) {
                let value = record[col.dataIndex];
                if (typeof value === 'string') {
                    value = value.replace(/\n/g, ' ');
                    if (col.originalField !== 'brief.description') {
                        value = value.replace(/^.*_{_VALUE_}_/, '');
                    }
                }
                resultRow.push(value);
            });
            result.push(resultRow);
        });

        return result;
    };

    const getAllPagesData = async function (frame = getListFrame()) {
        const recordList = frame.Ext.getCmp('recordListGrid');
        let result = [];

        const header = getTableHeader(frame);
        result.push(header.map(col => col.caption));

        const nextPage = frame.document.getElementsByClassName('x-tbar-page-next')[0];
        let startingPage = frame.document.getElementsByClassName('currentPageIndex')[0].innerHTML;
        startingPage = parseInt(startingPage.substr(startingPage.lastIndexOf('>') + 1));
        let currentPage = startingPage;

        if (currentPage !== 1) {
            currentPage = 1;
            await moveToPage(1, recordList);
        }
        do {
            if (currentPage > 1) {
                await moveToPage(currentPage, recordList);
            }
            currentPage++;
            //TODO create icon
            result = result.concat(getCurrentPageData(header, false));
        } while (nextPage.getAttribute('aria-disabled') === 'false');

        await moveToPage(startingPage, recordList);

        return result;
    };

    top.document.documentElement.addEventListener('hpsmPageLoad', function() {
        addExportButtons();
    });
});
