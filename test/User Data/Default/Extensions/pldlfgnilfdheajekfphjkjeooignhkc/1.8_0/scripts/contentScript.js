var style=document.createElement('link');style.rel='stylesheet';style.type='text/css';style.href=chrome.extension.getURL('css/general.css');(document.head||document.documentElement).appendChild(style);var currentElement;function onMouseHoverElement(event){if(event===undefined)event=window.event;var target='target' in event?event.target:event.srcElement;var tooltip=document.createElement('span');tooltip.setAttribute('locator-data-tooltip',target.tagName);target.appendChild(tooltip);markElementTemp(target);target.addEventListener('mouseout',function(){unMarkAllTempElements();if(tooltip.parentNode){target.removeChild(tooltip)}})};function onClickElement(event){if(event===undefined)event=window.event;var t='target' in event?event.target:event.srcElement;t.classList.remove('marked-element-temp');var elo=new ElementsLocatorObj(location.href,null,new ElementLocator(getXPath(t),getCssPath(t),t.tagName,t.id,t.className,t.innerText,t.baseURI,getElementAttributes(t)));chrome.runtime.sendMessage(elo);currentElement=t};function getElementAttributes(element){var attributes=[];var elementAttributeNames=element.getAttributeNames();for(var index=0;index<elementAttributeNames.length;index++){if(elementAttributeNames[index]=='class'&&element.getAttribute(elementAttributeNames[index])==''){continue}
attributes.push(new ElementAttribute(elementAttributeNames[index],element.getAttribute(elementAttributeNames[index])))}
return attributes}
function getXPath(element){if(element.id!==''){var xpathWithId='//*[@id=\"'+element.id+'\"]';return xpathWithId}
if(element===document.body)return element.tagName.toLowerCase();var ix=0;var siblings=element.parentNode.childNodes;for(var i=0;i<siblings.length;i++){var sibling=siblings[i];if(sibling===element)return getXPath(element.parentNode)+'/'+element.tagName.toLowerCase()+'['+(ix+1)+']';if(sibling.nodeType===1&&sibling.tagName===element.tagName){ix++}}};function getElementsByXPath(xpath,parent){let results=[];let query=document.evaluate(xpath,parent||document,null,XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,null);for(let i=0,length=query.snapshotLength;i<length;++i){results.push(query.snapshotItem(i))}
return results}
function getCssPath(el){if(!(el instanceof Element))
return;var path=[];while(el.nodeType===Node.ELEMENT_NODE){var selector=el.nodeName.toLowerCase();if(el.id){selector+='#'+el.id;path.unshift(selector);break}else{var sib=el,nth=1;while(sib=sib.previousElementSibling){if(sib.nodeName.toLowerCase()==selector)
nth++}
if(nth!=1)
selector+=":nth-of-type("+nth+")"}
path.unshift(selector);el=el.parentNode}
return path.join(" > ")}
function checkVisible(elm){if(elm){var rect=elm.getBoundingClientRect();var viewHeight=Math.max(document.documentElement.clientHeight,window.innerHeight);return!(rect.bottom<0||rect.top-viewHeight>=0)}}
function markElement(element){if(element){element.classList.add("marked-element")}}
function markElementTemp(element){if(element){element.classList.add("marked-element-temp")}}
function markElementSuccess(element){if(element){element.classList.add("mark-successfully")}}
function markAllElement(element){if(element){element.classList.add("marked-element")}}
function unMarkElement(element,isTemp){if(element){if(isTemp){element.classList.remove("mark-successfully");element.classList.remove("marked-element-temp")}
else{element.classList.remove("marked-element")}
if(element.getAttribute('class')==''){element.removeAttribute('class')}
else{element.setAttribute('class',element.getAttribute('class').trim())}}}
function unMarkElements(elementArr,isTemp){for(var index=0;index<elementArr.length;index++){unMarkElement(elementArr[index],isTemp)}}
function unMarkAllTempElements(){unMarkElements(document.querySelectorAll('*[class*="marked-element-temp"]'),!0);unMarkElements(document.querySelectorAll('*[class*="mark-successfully"]'),!0)}
function unMarkAllMarks(){var markElements=document.querySelectorAll('*[class*="marked-element"]');for(var index=0;index<markElements.length;index++){unMarkElement(markElements[index])}
var markElementsTemp=document.querySelectorAll('*[class*="marked-element-temp"]');for(var index=0;index<markElementsTemp.length;index++){unMarkElement(markElementsTemp[index],!0)}
var markElementsSuccess=document.querySelectorAll('*[class*="mark-successfully"]');for(var index=0;index<markElementsSuccess.length;index++){unMarkElement(markElementsSuccess[index],!0)}}
chrome.runtime.onMessage.addListener(function(eventPageMessage){if(eventPageMessage.turnOnOff==!0){document.addEventListener("mouseover",onMouseHoverElement);document.addEventListener("mousedown",onClickElement)}
else if(eventPageMessage.turnOnOff==!1){document.removeEventListener("mouseover",onMouseHoverElement);document.removeEventListener("mousedown",onClickElement)}
if(eventPageMessage.elementLocator){if(eventPageMessage.elementLocator.cssSelector){showElementOnPage(eventPageMessage)}
else if(eventPageMessage.elementLocator.length){if(currentElement){markElementSuccess(currentElement);currentElement=null}
for(var i=0;i<eventPageMessage.elementLocator.length;i++){markElement(document.querySelector(eventPageMessage.elementLocator[i].cssSelector))}}}
else{unMarkAllMarks()}
if(eventPageMessage.checkElements){getElementsCheckResults(eventPageMessage.checkElements)}});function getElementsCheckResults(checkElements){for(var index=0;index<checkElements.length;index++){var elementCheck=checkElements[index];var elementInPage=document.querySelectorAll(elementCheck.elementLocator.cssSelector);elementCheck.isExist=elementInPage.length>0?!0:!1;elementCheck.cssSelectorIsDuplicated=elementInPage.length>1?!0:!1;var elementsInPageWithXpath=getElementsByXPath(elementCheck.elementLocator.xpath,document);elementCheck.xpathIsDuplicated=elementsInPageWithXpath.length>1?!0:!1;checkElements[index]=elementCheck}
chrome.runtime.sendMessage(new ElementsLocatorObj(location.href,null,null,checkElements))}
function showElementOnPage(eventPageMessage){unMarkAllTempElements();if(currentElement){markElementSuccess(currentElement);currentElement=null}
else{var element=document.querySelector(eventPageMessage.elementLocator.cssSelector);if(element){markElementTemp(element);if(!checkVisible(element)){element.scrollIntoView({behavior:"smooth",block:"center",inline:"center"})}}}}
function sendElementsLocatorObj(){if(document.visibilityState=='visible'){chrome.runtime.sendMessage(new ElementsLocatorObj(location.href,null,null))}}
document.addEventListener('visibilitychange',function(){sendElementsLocatorObj()});sendElementsLocatorObj()