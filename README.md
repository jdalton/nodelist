## Review of the NodeList API Proposal
#### original proposal available [here][1].


## Concerns
I think adding sugar to the NodeList interface or creating a special decorator via `document.createNodeList()` is an awesome idea. However, I have a few concerns / issues with the Resig's current proposal.

 1. The NodeList decorator should **not** have a `nodeType` property.
    It is not a node and cannot be inserted into the DOM.

 2. The developer **should** be able to `pop()`, `push()`, `shift()`,
    `splice()`, `unshift()`, change the `length` property, and add values
    by index. This may mean rethinking if `requery()` is needed and may
    reduce the need for `toArray()`.
    
 3. The NodeList decorator should **not** use callbacks for `add` and
    `remove` events. Instead it should use `addEventListener`
    and friends to add listeners for a new `add` and `remove` event.
    
 4. I don't see a practical use for the `secure()` method. It seems like
    a ton of work to implement when all I have to do is query the DOM 
    to get access to any element I want.

 5. I don't see a practical use for the `reQuery` method as well. If
    I need a fresh NodeList decorator I simply pass a DOM List
    *(DOM NodeList, HTMLCollection, StaticNodeList)* to `document.createNodeList()`.
    The baggage of maintaining a history and then limiting NodeList decorators to
    *readonly* access seems like a step in the wrong direction.


## A Fresh JavaScript Implementation
With that said I have written my own JavaScript implementation inspired by John Resig's NodeList proposal. It uses *sandboxed arrays* so the object returned from `document.createNodeList()` is a *real* array.

### Browser Support
Should support a wide range of browsers including:

  - IE6+
  - Safari 2.0.0+
  - Opera 9.25+
  - Firefox 1.5+
  - Chrome 1+.

### Optimizations
The implementation is optimized for the common use case of passing a DOM List to `document.createNodeList()`.
Because the output is a **real** array you don't need to worry about converting the NodeList decorator for use
with Function#apply or other methods that expect an array.

### Editable
You may use the `pop()`, `push()`, `shift()`, `splice()`, `unshift()` methods.
However, doing so will break the link between the DOM List and `requery()`.

*(I have not added getter/setter checks for the length property changes)*

### Secure
The secured NodeList decorator is **not** accessible through an exposed property.

### ES5 Compliant
Array methods on the NodeList decorator follow the ES5 specification. This means `concat()` allows more than one argument, and `forEach()` does *not* return an object reference.

### Future Proofing
I have avoided extending DOM object prototypes because it is too hard to maintain and practically ensures the implementation would break at a later date. For more information on why extending DOM object prototypes is *verboten* please read Kangax's post "[What's wrong with extending the DOM][2]".

### Tests and Benchmarks
Revised unit tests may be found [here][3] and benchmarks may be found [here][4].

  [1]: http://github.com/jeresig/nodelist#readme
  [2]: http://perfectionkills.com/whats-wrong-with-extending-the-dom/
  [3]: http://dl.dropbox.com/u/513327/nodelist/unittest/index.html
  [4]: http://dl.dropbox.com/u/513327/nodelist/benchmark/index.html