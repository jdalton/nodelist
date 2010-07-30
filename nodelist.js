/*  "Unofficial" NodeList API Implementation
 *  (c) 2010 John-David Dalton <john@fusejs.com>
 *  John Resig's site: http://nodelist.org/
 *
 *  Fuse JavaScript framework, version Alpha
 *  (c) 2008-2010 John-David Dalton
 *  http://www.fusejs.com/
 *
 *  Both "Unofficial" NodeList and FuseJS are released under the MIT license.
 */
(function(window, undefined) {

  var InternalNodeList, MODE,

  ACTIVEX_MODE = 1,

  PROTO_MODE   = 2,

  IFRAME_MODE  = 3,

  IDENTITY = function(x) { return x },

  MUTABLE_ERROR = 'NodeList is not mutable.',

  NON_HOST_TYPES = { 'boolean': 1, 'number': 1, 'string': 1, 'undefined': 1 },

  cache = [],

  counter = 1,

  doc = window.document,

  docEl = doc.documentElement,

  postProcess = IDENTITY,

  reNodeListClass = /(?:NodeList|HTMLCollection|Object)/,

  slice = [].slice,

  toString = {}.toString,

  uid = 'uid' + (new Date).getTime(),

  add_ = function(self, data) {
    // init private data object
    data || (data = { });
    data.data = data;
    data.self = self;

    return function(passcode, key, value) {
      var result = null;
      if (passcode === uid) {
        result = data.self;
        if (key) {
          if (value !== undefined) {
            data[key] = value;
          } else {
            result = data[key];
          }
        }
      }
      return result;
    };
  },

  addPlugins = function(plugin, method, creator) {
    var methods = method.split(',');
    while (method = methods.shift()) {
      if (isHostType(doc, method) ||
          typeof Array.prototype[method] == 'function') {
        plugin[method] = creator(method);
      }
    }
  },

  adoptNodeList = function(parentList, child, data) {
    var pdata = parentList._(uid, 'data');
    data.mutable = pdata.mutable;

    child._ || (child._ = add_(child, data));
    if (pdata.self != parentList) {
      child = child.secure();
    }
    child.parentNodeList = parentList;
    return child;
  },

  concatList = function(list, otherList) {
    var pad = list.length, length = otherList.length;
    while (length--) list[pad + length] = otherList[length];
    return list;
  },

  contains = function(element, descendant) {
    contains = function(element, descendant) {
      while (descendant = descendant[PARENT_NODE]) {
        if (descendant == element) return true;
      }
      return false;
    };

    // true for all but Safari 2
    // ensure element.contains() returns the correct results;
    var div = doc.createElement('div');
    if (isHostType(div, 'contains') &&
        div.appendChild(div.cloneNode(div, false)) &&
        div.appendChild(div.cloneNode(div, true)) &&
        !div.firstChild.contains(div.childNodes[1].firstChild)) {

      var __contains = contains;
      contains = function(element, descendant) {
        return element.nodeName > '@'
          ? element != descendant && element.contains(descendant)
          : __contains(element, descendant);
      };
    }
    return contains(element, descendant);
  },

  fromNodeList = function(nodes, result) {
    var i = -1;
    result || (result = []);
    while (result[++i] = nodes[i]) { }
    return result.length-- && result;
  },

  getRoot = function(element) {
    var parentNode;
    if (isDetached(element)) {
      do {
        if (!(parentNode = element[PARENT_NODE])) {
          return element;
        }
      } while (element = parentNode);
    }
    return doc;
  },

  indexOf = function(value) {
    indexOf = [].indexOf;
    if (typeof indexOf != 'function') {
      indexOf = function(value) {
        var length = this.length;
        while (length--) {
          if (this[length] === value) return length;
        }
        return -1;
      };
    }
    return indexOf(value);
  },

  isDetached = function(element) {
    // true for Firefox, Safari, and Opera 9.5+
    if (HAS_COMPARE_DOCUMENT_POSITION) {
      isDetached = function(element) {
        return (doc.compareDocumentPosition(element) & 1) == 1;
      };
    }
    // true for IE and Opera
    else if (HAS_SOURCE_INDEX) {
      isDetached = function(element) {
        return element.ownerDocument.all[element.sourceIndex] != element;
      };
    }
    else{
      isDetached = function(element) {
        return !(element[PARENT_NODE] && contains(element.ownerDocument, element));
      };
    }
    return isDetached(element);
  },

  isFunction = function(value) {
    return toString.call(value) == '[object Function]';
  },

  isHostType = function isHostType(object, property) {
    var type = typeof object[property];
    return type == 'object' ? !!object[property] : !NON_HOST_TYPES[type];
  },

  isNode = function(value) {
    return value && (!toString.call(value).indexOf('[object HTML') ||
      typeof value.nodeType == 'number');
  },

  isNodeList = function(value) {
    return value && reNodeListClass.test(toString.call(value)) && 'item' in value;
  },

  isNodeValid = function(node) {
    return node && (node.nodeName > '@' || node.nodeType == 3) && node.ownerDocument == doc;
  },

  postProcessIframe = function(Array) {
    postProcess =
    postProcessIframe = function(Array) {
      var iframe = cache[cache.length - 1];
      iframe.parentNode.removeChild(iframe);
      return Array;
    };

    postProcessIframe(Array);

    // Safari does not support sandboxed natives from iframes :(
    if (Array().constructor == window.Array) {
      if (HAS_ACTIVEX) {
        setMode(ACTIVEX_MODE);
      } else if (HAS_PROTO) {
        setMode(PROTO_MODE);
      }
      cache.pop();
      return createArray();
    }
    return Array;
  },

  setMode = function(mode) {
    postProcess = (MODE = mode) == IFRAME_MODE ? postProcessIframe : IDENTITY;
  },

  sort = function(group) {
    var compareSiblings = function(a, b) {
      while (b = b.previousSibling) {
        if (b == a) return -1;
      }
      return 1;
    },

    getIndex = function(node) {
      var nodes, newQueue, parentNode, i, j, k, queue = [], result = -1;

      while (node) {
        ++result;

        // traverse siblings to the parentNode
        parentNode = node[PARENT_NODE];
        while (node = node.previousSibling) {
          ++result;

          // count descendants of each sibling on the way to the parentNode
          // http://www.jslab.dk/articles/non.recursive.preorder.traversal.part4
          i = -1; nodes = node.childNodes;
          while ((queue = [nodes[++i]])[0]) {

            while (queue.length) {

              // drill down through the queued descendants
              j = -1; newQueue = [];
              while (descendant = queue[++j]) {
                ++result;

                // queue descendants of descendants...
                k = -1; descendants = descendant.childNodes;
                while (descendant = descendants[++k]) {
                  newQueue.push(descendant);
                }
              }
              queue = newQueue;
            }
          }
        }
        // move up to the parentNode and start again
        node = parentNode;
      }
      return result;
    },

    sorter = function(a, b) {
      return getIndex(b) < getIndex(a) ? 1 : -1;
    };

    if (HAS_COMPARE_DOCUMENT_POSITION) {
      sorter = function(a, b) {
        // if node B is before node A return 1 else -1
        return a.compareDocumentPosition(b) & 2 ? 1 : -1;
      };
    }
    else if (HAS_SOURCE_INDEX) {
      sorter = function(a, b) {
        var isElementA = a.nodeType == 1,
         isElementB    = b.nodeType == 1,
         indexA        = (isElementA ? a : a.parentNode).sourceIndex,
         indexB        = (isElementB ? b : b.parentNode).sourceIndex;

        if (isElementA && isElementB) {
          return indexB < indexA ? 1 : -1;
        }
        if (isElementA && !isElementB) {
          // ensure index B is really less than A
          return indexB < indexA ? compareSiblings(a, b) : -1;
        }
        if (!isElementA && isElementB) {
          // ensure index A is really less than B
          return indexA < indexB ? -1*compareSiblings(b, a) : 1;
        }
        if (indexA != indexB) {
          // text nodes belonging to different parents
          return indexB < indexA ? 1 : -1;
        }
        // text nodes that are siblings
        return compareSiblings(a, b);
      };
    }

    sort = function(group) {
      group.sort(sorter);
      return group;
    };
    return sort(group);
  },

  HAS_ACTIVEX = !!(function() {
    try { return new ActiveXObject('htmlfile') } catch (e) { }
  })(),

  HAS_COMPARE_DOCUMENT_POSITION =
    isHostType(doc, 'compareDocumentPosition'),

  HAS_IFRAME = isHostType(doc, 'createElement') &&
    isHostType(window, 'frames') && 'src' in doc.createElement('iframe'),

  HAS_PROTO = (function() {
    var result, arr = [], backup = arr['__proto__'];
    if (arr['__proto__'] == Array.prototype) {
      arr['__proto__'] = { };
      result = typeof arr.push == 'undefined';
      arr['__proto__'] = backup;
    }
    return !!result && isFunction(arr.push);
  })(),

  HAS_SOURCE_INDEX = (function(div) {
    return isHostType(doc, 'all') &&
      typeof (div = doc.createElement('div')).sourceIndex == 'number' &&
      div.appendChild(div.cloneNode(false)).sourceIndex > -1;
  })(),

  MATCHED_SELECTORS =
    isHostType(doc, 'matchesSelectors')      && 'matchesSelectors'    ||
    isHostType(doc, 'mozMatchesSelector')    && 'mozMatchesSelector'  ||
    isHostType(doc, 'msieMatchesSelector')   && 'msieMatchesSelector' ||
    isHostType(doc, 'webkitMatchesSelector') && 'webkitMatchesSelector',

  PARENT_NODE =
    isHostType('parentElement', docEl) ? 'parentElement' : 'parentNode',

  createArray = function() {
    var sandbox       = createSandbox(),
     isProtoMode      = MODE == PROTO_MODE,
     isArrayChainable = sandbox.Array().constructor != window.Array,
     plugin           = isProtoMode && new sandbox.Array || sandbox.Array.prototype,
     __Array          = sandbox.Array,
     __concat         = plugin.concat,
     __indexOf        = plugin.indexOf,
     __lastIndexOf    = plugin.lastIndexOf,
     __push           = plugin.push,
     __reverse        = plugin.reverse,
     __slice          = plugin.slice,
     __splice         = plugin.splice,
     __filter         = plugin.filter,
     __map            = window.Array().map,

    Array = function(length) {
      var argLen = arguments.length;
      if (argLen) {
        return argLen == 1 && typeof length == 'number'
          ? new __Array(length)
          : fromArray(arguments);
      }
      return new __Array;
    },

    fromArray = function(array) {
      var result = new __Array;
      __push.apply(result, array);
      return result;
    };

    if (isArrayChainable) {
      Array = __Array;

      fromArray = function(array) {
        return __slice.call(array, 0);
      };
    } else if (isProtoMode) {
      Array = function(length) {
        var result = [], argLen = arguments.length;
        if (argLen) {
          if (argLen == 1 && typeof length == 'number') {
            result.length = length;
          } else {
            result.push.apply(result, arguments);
          }
        }
        result.__proto__ = plugin;
        return result;
      };

      fromArray = function(array) {
        var result = __slice.call(array, 0);
        result['__proto__'] = plugin;
        return result;
      };
    }

    plugin.createNodeList = createNodeList;

    plugin.concat = function() {
      var args = __slice.call(arguments, 0), length = args.length, i = -1;
      while (++i < length) {
        if (isNodeList(args[i])) {
          // accept node lists
          args[i] = fromNodeList(args[i]);
        } else if (isNode(args[i])) {
          // accept nodes
          args[i] = args[i];
        } else if (args[i].constructor == InternalNodeList) {
          // accept decorators
          args[i] = __slice.call(args[i]._(uid), 0);
        } else {
          // accept array-like objects
          args[i] = __slice.call(args[i], 0);
        }
      }
      return createNodeList.call(this, __concat.apply(this._(uid), args),
        { 'callerName': 'concat', 'callerArgs': arguments });
    };

    plugin.item = function(index) {
      return index > -1 && index < this.length ? this[index] : null;
    };

    plugin.requery = function() {
      var data = this._(uid, 'data'), parentList = this.parentNodeList;
      return data.mutable ? this.slice(0) :
        this[data.callerName].apply(parentList && parentList.requery() || this, data.callerArgs || []);
    };

    plugin.reverse = function() {
      return adoptNodeList(this, this.length > 0 ?
        fromArray(__reverse.call(this)) : Array(), { 'callerName': 'reverse' });
    };

    plugin.secure = function() {
      var hidden = this, exposed = hidden, length = hidden.length;
      if (hidden._(uid) == hidden) {
        // null items
        exposed = InternalNodeList();
        while (length--) exposed[length] = null;
        exposed.parentNodeList = null;
        exposed._ = hidden._;
      }
      return exposed;
    };

    plugin.slice = function(start, end) {
      var nodes = this._(uid), result = end == null ?
        __slice.call(nodes, start) : __slice.call(nodes, start, end);

      return adoptNodeList(this, isArrayChainable ? result : fromArray(result),
        { 'callerName': 'slice', 'callerArgs': [start, end] });
    };

    plugin.splice = function(start, deleteCount) {
      var data = this._(uid, 'data');
      if (data.self != this) {
        throw new Error(MUTABLE_ERROR);
      }
      data.mutable = true;
      return doc.createNodeList(__splice.apply(data.self, arguments));
    };

    plugin.toArray = function() {
      return slice.call(this, 0);
    };

    addPlugins(plugin, 'querySelectorAll,queryScopedSelectorAll', function(method) {
      return function(selector) {
        var query, i = -1, nodes = this._(uid), length = nodes.length, result = [];
        while (++i < length) {
          if (i in nodes && (query = nodes[i][method](selector)).length)
            concatList(result, query);
        }
        return this.createNodeList(result,
          { 'callerName': method, 'callerArgs': [selector] });
      };
    });

    addPlugins(plugin, 'addEventListener,removeEventListener,dispatchEvent', function(method) {
      return function(type, handler, capture) {
        var nodes = this._(uid), length = nodes.length, i = -1;
        if (handler) {
          while (++i < length) i in nodes && nodes[i][method](type, handler, capture);
        } else {
          while (++i < length) i in nodes && nodes[i][method](type);
        }
        return this
      };
    });

    addPlugins(plugin, 'push,unshift', function(method) {
      var __method = plugin[method];
      return function() {
        var arg, args = [], i = -1, j = i, data = this._(uid, 'data'),
         length = arguments.length, self = data.self;

        if (self != this) {
          throw new Error(MUTABLE_ERROR);
        }
        // filter duplicates and non-nodes
        while (++i < length) {
          arg = arguments[i];
          if (isNode(arg) && indexOf.call(self, arg) < 0) {
            args[++j] = arg;
          }
        }
        data.mutable = true;
        return __method.apply(this, args);
      };
    });

    addPlugins(plugin, 'pop,shift', function(method) {
      var __method = plugin[method];
      return function() {
        var data = this._(uid, 'data');
        if (data.self != this) throw new Error(MUTABLE_ERROR);
        data.mutable = true;
        return __method.call(this);
      };
    });

    if (isFunction(plugin.filter)) {
      plugin.filter = function(callback, thisArg) {
        var result, __callback = callback, secured = this._(uid), self = this;
        if (secured != self) {
          callback = function(value, index) {
            return __callback.call(this, null, index, self);
          };
          // comply with ES5
          if (typeof __callback != 'function') {
            throw new TypeError;
          }
        }
        result = __filter.call(secured, callback, thisArg);
        return adoptNodeList(this, isArrayChainable ? result : fromArray(result),
          { 'callerName': 'filter', 'callerArgs': [callback, thisArg] });
      };
    }
    if (isFunction(plugin.indexOf)) {
      plugin.indexOf = function(value) {
        return __indexOf.call(this._(uid), value);
      };
    }
    if (isFunction(plugin.lastIndexOf)) {
      plugin.lastIndexOf = function(value) {
        return __lastIndexOf.call(this._(uid), value);
      };
    }
    if (isFunction(plugin.map)) {
      plugin.map = function(callback, thisArg) {
        return createNodeList.call(this, __map.call(this, callback, thisArg),
          { 'callerName': 'map', 'callerArgs': [callback, thisArg] });
      };
    }
    if (MATCHED_SELECTORS) {
      plugin.filterSelector = function(selector) {
        var nodes = this._(uid), i = -1, j = i,
         length = nodes.length, result = Array();
        while (++i < length) {
          if (i in nodes && nodes[i][MATCHED_SELECTORS]())
            result[++j] = nodes[i];
        }
        return adoptNodeList(this, result,
          { 'callerName': 'filterSelector', 'callerArgs': [selector] });
      };

      plugin.matchesSelector = function(selector) {
        var nodes = this._(uid), length = nodes.length, i = -1;
        while (++i < length) {
          if (i in nodes && nodes[i][MATCHED_SELECTORS]())
            return true;
        }
        return false;
      };
    }

    (Array.prototype = plugin).constructor = Array;
    return postProcess(Array);
  },

  createNodeList = function(nodes, data) {
    var docIndex, index, length, sorted, temp, isNL = isNodeList(nodes),
     result = InternalNodeList(), self = this, groups = [],
     roots = [], i = -1, j = i, k = i;

    if (arguments.length > 0 && (!nodes || typeof nodes != 'object' && !isNL)) {
      throw new Error('Incorrect argument: ' + nodes + ' ' + (typeof nodes));
    }

    // setup data object
    data || (data = { 'callerName': 'createNodeList', 'callerArgs': [nodes] });

    if (isNL) {
      // optimize for common use case
      fromNodeList(nodes, result);
      data.mutable = false;
    }
    else if (nodes) {
      if (nodes.constructor == InternalNodeList) {
        temp = nodes._(uid, 'data');
        data.mutable = temp.mutable;
        nodes = temp.self.toArray();
      } else {
        data.mutable = true;
      }
      // support array-like objects
      length = nodes.length >>> 0;

      while (++i < length) {
        if (isNodeValid(node = nodes[i])) {
          // resolve which group the node belongs to
          if (isDetached(node)) {
            if ((index = indexOf.call(roots, root = getRoot(node))) < 0) {
              groups[index = roots.push(root) - 1] = [];
            }
          } else {
            // optimize for common use case
            if ((index = docIndex) == null) {
              groups[index = docIndex = roots.push(doc) - 1] = [];
            }
          }
          // avoid duplicate nodes
          if (indexOf.call(groups[index], node) < 0) {
            groups[index].push(node);
          }
        }
      }
      length = groups.length;
      while (++j < length) {
        concatList(result, sort(groups[j]));
      }
    }

    if (this.constructor == InternalNodeList) {
      result = adoptNodeList(this, result, data);
    } else {
      result._ = add_(result, data);
      result.parentNodeList = null;
    }
    return result;
  },

  createSandbox = function() {
    var iframe, key, name, parentNode, result, xdoc;
    switch (MODE) {

      case PROTO_MODE: return window;

      case ACTIVEX_MODE:
        // IE requires the iframe/htmlfile remain in the cache or it will become corrupted
        xdoc = new ActiveXObject('htmlfile');
        xdoc.write('<script><\/script>');
        xdoc.close();
        cache.push(xdoc);

        // prevents a memory leak in IE
        // IE doesn't support bfcache so we don't have to worry about breaking it.
        if (isHostType(window, 'attachEvent')) {
          window.attachEvent('onunload', function() { cache.length = 0 });
        }
        return xdoc.parentWindow;

      case IFRAME_MODE:
        key = '/* fusebox_iframe_cache_fix */';
        name = uid + counter++;
        parentNode = doc.body || docEl;

        try {
          iframe = doc.createElement('<iframe name="' + name + '">');
        } catch(e) {
          (iframe = doc.createElement('iframe')).name = name;
        }

        try {
          // Detect caching bug in Firefox 3.5+
          // A side effect is that Firefox will use the __proto__ technique
          // when served from the file:// protocol as well
          if ('MozOpacity' in docEl.style &&
              isHostType(window, 'sessionStorage') &&
              !window.sessionStorage[key]) {
            window.sessionStorage[key] = 1;
            throw new Error;
          }

          iframe.style.display = 'none';
          parentNode.insertBefore(iframe, parentNode.firstChild);

          result = window.frames[name];
          xdoc = result.document;
          xdoc.write(
            // Firefox 3.5+ glitches when an iframe is inserted and removed,
            // from a page containing other iframes, before dom load.
            // When the page loads one of the other iframes on the page will have
            // its content swapped with our iframe. Though the content is swapped,
            // the iframe will persist its `src` property so we check if our
            // iframe has a src property and load it if found.
            '<script>var g=this,c=function(s){' +
            '(s=g.frameElement.src)&&g.location.replace(s);' +
            'if(g.parent.document.readyState!="complete"){g.setTimeout(c,10)}};' +
            'c()<\/script>');

          xdoc.close();
          cache.push(iframe);
          return result;
        }
        catch (e) {
          if (HAS_ACTIVEX) {
            setMode(ACTIVEX_MODE);
            return createSandbox();
          }
          if (HAS_PROTO) {
            setMode(PROTO_MODE);
            return createSandbox();
          }
          throw new Error('Fusebox failed to create a sandbox by iframe.');
        }
    }
    throw new Error('Fusebox failed to create a sandbox.');
  };

  /*--------------------------------------------------------------------------*/

  if (isHostType(doc, 'createNodeList')) {
    return;
  }
  // Fix document.readyState for Firefox < 3.6
  if (typeof doc.readyState != 'string' && isHostType(doc, 'addEventListener')) {
    doc.readyState = 'loading';
    doc.addEventListener('DOMContentLoaded', function() { doc.readyState = 'interactive' }, true);
    window.addEventListener('load', function() { doc.readyState = 'complete' }, true);
  }
  // The htmlfile ActiveX object is supported by IE4+ and avoids https mixed
  // content warnings in IE6. It is also used as a workaround for access denied errors
  // thrown when using iframes to create sandboxes after the document.domain is
  // set (Opera 9.25 is out of luck here).
  if (HAS_ACTIVEX && !isHostType(window, 'XMLHttpRequest') &&
        window.location && window.location.protocol == 'https:') {
    setMode(ACTIVEX_MODE);
  }
  // Iframes are the fastest and prefered technique
  else if (HAS_IFRAME) {
    setMode(IFRAME_MODE);
  }
  // A fallback for non browser environments
  else if (HAS_PROTO) {
    setMode(PROTO_MODE);
  }

  InternalNodeList = createArray();

  // expose
  doc.createNodeList = createNodeList;
})(this);