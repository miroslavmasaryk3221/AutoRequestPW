chrome.browserAction.setIcon({path:{"16":"images/elementsLocatorOff16.png","48":"images/elementsLocator48.png","128":"images/elementsLocator128.png"}});var elementLocatorOnOff=!1;var markAllElementsOnOff=!1;var currentLocationHref;var currentPageElements=[];var currentCheckElements=[];var contextMenuID;var currentElement;var contentDocument;chrome.browserAction.setBadgeBackgroundColor({color:'green'});chrome.runtime.onInstalled.addListener(function(){contextMenuID=chrome.contextMenus.create({title:'Turn '+(elementLocatorOnOff?'Off':'On')+' Elements Locator',id:'elementsLocatorMenu',contexts:['all']})});function isElementDuplicated(arr,element){for(var i=0;i<arr.length;i++){if(arr[i].xpath==element.xpath){return!0}}
return!1}
function removeHashFromUrl(url){if(url.substring(url.length-1,url.length)=='#'){return url.substring(0,url.length-1)}
return url}
chrome.runtime.onMessage.addListener(function(contentMessage){currentCheckElements=null;currentElement=contentMessage.elementLocator;if(contentMessage.locationHref){currentLocationHref=removeHashFromUrl(contentMessage.locationHref)}
if(contentMessage.elementLocator){contentMessage.elementLocator.date=new Date().toString();idbKeyval.get(currentLocationHref).then(val=>{var arr=[];if(val){arr=val}
if(isElementDuplicated(arr,contentMessage.elementLocator)==!1){arr.push(contentMessage.elementLocator)}
idbKeyval.set(currentLocationHref,arr).then(res=>{getElements()})})}
if(contentMessage.checkElements){currentCheckElements=contentMessage.checkElements}
else{getElements();SetContextMenuTitle()}
checkForErrors()});function checkForErrors(){chrome.browserAction.setBadgeBackgroundColor({color:'green'});if(!currentCheckElements||!currentCheckElements.length){return}
for(var index=0;index<currentCheckElements.length;index++){if(!currentCheckElements[index].isExist){chrome.browserAction.setBadgeBackgroundColor({color:'red'});return}}}
function turnOnOff(onOff){elementLocatorOnOff=onOff;if(onOff){chrome.browserAction.setIcon({path:{"16":"images/elementsLocator16.png","48":"images/elementsLocator48.png","128":"images/elementsLocator128.png"}})}
else{chrome.browserAction.setIcon({path:{"16":"images/elementsLocatorOff16.png","48":"images/elementsLocator48.png","128":"images/elementsLocator128.png"}})}
sendRunTimeMessage(new ElementsLocatorObj(null,elementLocatorOnOff,markAllElementsOnOff?currentPageElements:null));console.log("element locator turn: "+(onOff?"On":"Off"))}
function checkElements(){getElements()}
function getElements(){idbKeyval.get(currentLocationHref).then(val=>{currentCheckElements=null;currentPageElements=val?val:[];var currentElem=currentElement?currentElement:null;var checkElements=[];for(var index=0;index<currentPageElements.length;index++){checkElements.push(new CheckElement(currentPageElements[index]))}
sendRunTimeMessage(new ElementsLocatorObj(null,elementLocatorOnOff,markAllElementsOnOff?currentPageElements:currentElem,checkElements));currentElement=null;updateBadge()})}
function deleteElement(ElementsLocatorObj){idbKeyval.get(currentLocationHref).then(val=>{if(!val)return;var elementWasDelete=!1;for(var i=0;i<val.length;i++){if(val[i].xpath==ElementsLocatorObj.elementLocator.xpath){val.splice(i,1);elementWasDelete=!0}}
if(elementWasDelete){idbKeyval.set(currentLocationHref,val).then(res=>{getElements()})}})}
function deleteElements(){idbKeyval.delete(currentLocationHref);getElements()}
function clearElements(){idbKeyval.clear()}
function updateBadge(){chrome.browserAction.setBadgeText({text:currentPageElements.length.toString()})}
function SetContextMenuTitle(){if(contextMenuID){chrome.contextMenus.update(contextMenuID,{title:'Turn '+(elementLocatorOnOff?'Off':'On')+' Elements Locator',contexts:['all']})}}
chrome.contextMenus.onClicked.addListener(function(info,tab){if(info.menuItemId==="elementsLocatorMenu"){turnOnOff(elementLocatorOnOff?!1:!0);SetContextMenuTitle()}});function markAllElements(mark){var elementsToMark=mark?currentPageElements:null;sendRunTimeMessage(new ElementsLocatorObj(null,elementLocatorOnOff,elementsToMark));markAllElementsOnOff=mark}