/**
 * Close tabs functionality handler
 */
addPlugin('MainPage', 'loading', function() {
    function createTabContextMenuListeners() {
        top.document.documentElement.addEventListener('hpsmPageLoad', function() {
            // Get the menu element
            const menu = top.document.getElementById('rightClickMenu');
            // If menu exists then delete it from the DOC
            if (!menu) createMenu();

            // Get all the tabs which are closable [only one is not, my todo list]
            const closableTabs = top.document.getElementsByClassName('x-tab-strip-closable');

            // Go through all of the elements of tabNodes
            for (const tab of closableTabs) {

                // Checking if listeners were already set once
                if (tab.getAttribute('listenersSet') !== 'true') {
                    /**
					 * Creating new attribute to each of the tabs and setting them true, this attribute is checked just before in the IF
					 * this attribute prevents from setting the listeners multiple times and creating unnecessary calls
					 */
                    tab.setAttribute('listenersSet', 'true');
                    /**
					 * Adding contextmenu event (which is Right-Click on object) to the tab elements which are stored in tabNodes
					 */
                    tab.addEventListener('contextmenu', function(event) {
                        /**
						 * Calling the createMenu function which is responsible for creating the custom menu.
						 * args: tabNodes[i] is handed over to the function to determine which TAB were actually clicked
						 */
                        activateContextMenu(event.target);
                    });
                }
            }
        });
    }

    function activateContextMenu(clickedTab) {
        // Get the position of the MouseDown event
        const pos = {
            left: event.clientX,
            top: event.clientY - 20
        };

        // Calling setPositionOfMenu and handover the args
        const menu = document.getElementById('rightClickMenu');
        setPositionOfMenu(menu, pos);

        SMweb.clickedTabId = clickedTab.offsetParent.id;
    }
    /**
     * Function is reponsible for position of the menu
     * @param {HTMLElement} menu - the element which is created in the createMenu functionality
     * @param {{top: number, left: number}} pos - top, left are the positions of the Mousedown event
     */
    function setPositionOfMenu(menu, pos) {
        if (menu && pos && pos.top && pos.left){
            menu.style.top = pos.top + 'px';
            menu.style.left = pos.left + 'px';
            menu.style.display = 'block';
        }
    }

    /**
     * Function is responsible for the 'Close' li element with closeCurrentTab id
     */
    function closeCurrentTab() {
        const closableTabs = top.document.getElementsByClassName('x-tab-strip-closable');
        for (const tab of closableTabs) {
            if (SMweb.clickedTabId === tab.id) {
                tab.firstElementChild.click();
                return;
            }
        }
    }

    /**
     * Function is responsible for the 'Close Others' li element with closeAllOtherTabs id
     * The function closes all TABs which are not active
     */
    function closeAllOtherTabs() {
        // Get all the tabs which are closable [only one is not, my todo list]
        const closableTabs = top.document.getElementsByClassName('x-tab-strip-closable');

        // Go through all of the elements of closableTabs
        for (const tab of closableTabs) {
            // The clicked tab is equal to the array's element do nothing with it
            if (SMweb.clickedTabId !== tab.id) {
                //close all the elements of the closeAllTabs array which is not equal to actualNode (which is the clicked one)
                tab.firstElementChild.click();
            }
        }
    }

    /**
     * "Close All" li element handler with closeAllTabs id
     * Closes every closable opened tab
     */
    function closeAllTabs() {
        // Get all the tabs which are closable [only one is not, my todo list]
        const closableTabs = top.document.getElementsByClassName('x-tab-strip-closable');

        // Go through all of the elements of closableTabs
        for (const tab of closableTabs) {
            // Close all elements of the closeAllTabs array
            tab.firstElementChild.click();
        }
    }

    /**
     * Function is responsible for creating new Menu element
     */
    function createMenu() {
        // Create a template which is the holder for the custom html code
        const template = top.document.createElement('template');
        // Creating html code and adding div and tags
        const html = `
            <div class="menu" id="rightClickMenu">
                <ul>
                    <li id="closeCurrentTab" title="Close this tab">Close</li>
                    <li id="closeAllOtherTabs" title="Close all other tabs">Close Others</li>
                    <li id="closeAllTabs" title="Close all tabs">Close All</li>
                </ul>
            </div>
        `;
        // Adding the html variable into the template
        template.innerHTML = html;
        // Adding the template to the DOC
        top.document.body.appendChild(template.content);

        // Calling the 3 different close functions
        document.getElementById('closeCurrentTab').addEventListener('click', closeCurrentTab);
        document.getElementById('closeAllOtherTabs').addEventListener('click', closeAllOtherTabs);
        document.getElementById('closeAllTabs').addEventListener('click', closeAllTabs);
    }

    createTabContextMenuListeners();
});

/**
 * Adding plugin to ALL documents
 * This hides the menu when the user clicks away
 */
addPlugin('all', 'complete', function() {
    if (!top.SMweb) return;

    // Add click event to the ALL elements
    addEventListener('click', () => {
        // Get the menu element
        const menu = top.document.getElementById('rightClickMenu');
        // If menu exists then hide it
        if (menu) {
            menu.style.display = 'none';
        }
    });

    addEventListener('contextmenu', event => {
        const targetEventClassName = event.target.offsetParent.className;
        const menu = top.document.getElementById('rightClickMenu');
        if (!(targetEventClassName.includes('x-tab-strip-closable'))){
            if (menu && menu.style.display === 'block'){
                menu.style.display = 'none';
            }
        }
    });
});
