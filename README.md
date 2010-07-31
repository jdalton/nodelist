## Review of the NodeList API Proposal
#### original proposal available [here][1].


## Concerns
I think adding sugar to the NodeList interface or creating a special decorator via `document.createNodeList()` is an awesome idea.
However, I have a few concerns / issues with Resig's current proposal.

 1. The NodeList decorator should **not** have a `nodeType` property.
    It's not a node and cannot be inserted into other nodes.

    *(Though an insertable list would be neat. InsertableList anyone?)*

 2. The developer **should** be able to `pop()`, `push()`, `shift()`,
    `splice()`, `unshift()`, change the `length` property, and add values
    by index to a NodeList decorator.

    Additionally, if the NodeList decorator had an internal `[[Class]]` of `Array`
    it would virtually illuminate the need for `toArray()` and allow the decorator
    to masquerade as an array enabling its use in popular JavaScript frameworks and
    methods like Function#apply.

 3. The NodeList decorator should **not** use callbacks for special `add` and `remove`
    events. Instead it should use `addEventListener` and friends to add listeners
    for a new `add` and `remove` event type.

 4. What is the practical use for the `secure()` method? It seems like
    a ton of work to implement and easy enough for a developer to bypass by
    simply querying the document again to gain access to the elements they want.

 5. The `requery()` method seems overly complex and restrictive. If a developer
    needs a fresh NodeList decorator they can simply pass another DOM List
    *(DOM NodeList, HTMLCollection, StaticNodeList)* to `document.createNodeList()`.
    The baggage of maintaining a history and then limiting NodeList decorators to
    *readonly* access seems like a step in the wrong direction.


## A Fresh JavaScript Implementation
With that said I have written my own JavaScript implementation inspired by John Resig's NodeList proposal. It uses *sandboxed arrays* so the object returned from `document.createNodeList()` is a *real* array.

### Browser Support
Should support a wide range of browsers including:

  - Chrome 1+
  - Firefox 1.5+
  - IE6+
  - Opera 9.25+
  - Safari 2.0.0+

### Optimizations
The implementation is optimized for the common use case of passing a DOM List to `document.createNodeList()`.
Because the output is a **real** array you don't need to worry about converting the NodeList decorator for use
with Function#apply or other methods that expect an array.

### Editable
Feel free to use the `pop()`, `push()`, `shift()`, `splice()`, and `unshift()` methods.
Keep in mind that doing so **will** break the link between the original DOM List and `requery()`.

*(I have not added getter/setter checks for length property changes)*

### Secure
The secured NodeList decorator is **not** accessible through an exposed property.

### ES5 Compliant
Array methods on the NodeList decorator follow the ES5 specification.
This means `concat()` allows more than one argument, `forEach()` does **not** return an object reference,
and `filter()` throws a `TypeError` if the callback argument is not a function.

### Future Proofing
DOM object prototype extensions are hard to maintain and would surely fail in future browser releases.
For more information on why extending DOM object prototypes in JavaScript is *verboten* please read
Kangax's post "[What's wrong with extending the DOM][2]".

### Tests and Benchmarks
Revised unit tests may be found [here][3] and benchmarks may be found [here][4].

  [1]: http://github.com/jeresig/nodelist#readme
  [2]: http://perfectionkills.com/whats-wrong-with-extending-the-dom/
  [3]: http://dl.dropbox.com/u/513327/nodelist/unittest/index.html
  [4]: http://dl.dropbox.com/u/513327/nodelist/benchmark/index.html