
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached
        const children = target.childNodes;
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            const seqLen = upper_bound(1, longest + 1, idx => children[m[idx]].claim_order, current) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
    }
    function append(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
                target.actual_end_child = target.firstChild;
            }
            if (node !== target.actual_end_child) {
                target.insertBefore(node, target.actual_end_child);
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target) {
            target.appendChild(node);
        }
    }
    function insert(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append(target, node);
        }
        else if (node.parentNode !== target || (anchor && node.nextSibling !== anchor)) {
            target.insertBefore(node, anchor || null);
        }
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    function create_animation(node, from, fn, params) {
        if (!from)
            return noop;
        const to = node.getBoundingClientRect();
        if (from.left === to.left && from.right === to.right && from.top === to.top && from.bottom === to.bottom)
            return noop;
        const { delay = 0, duration = 300, easing = identity, 
        // @ts-ignore todo: should this be separated from destructuring? Or start/end added to public api and documentation?
        start: start_time = now() + delay, 
        // @ts-ignore todo:
        end = start_time + duration, tick = noop, css } = fn(node, { from, to }, params);
        let running = true;
        let started = false;
        let name;
        function start() {
            if (css) {
                name = create_rule(node, 0, 1, duration, delay, easing, css);
            }
            if (!delay) {
                started = true;
            }
        }
        function stop() {
            if (css)
                delete_rule(node, name);
            running = false;
        }
        loop(now => {
            if (!started && now >= start_time) {
                started = true;
            }
            if (started && now >= end) {
                tick(1, 0);
                stop();
            }
            if (!running) {
                return false;
            }
            if (started) {
                const p = now - start_time;
                const t = 0 + 1 * easing(p / duration);
                tick(t, 1 - t);
            }
            return true;
        });
        start();
        tick(0, 1);
        return stop;
    }
    function fix_position(node) {
        const style = getComputedStyle(node);
        if (style.position !== 'absolute' && style.position !== 'fixed') {
            const { width, height } = style;
            const a = node.getBoundingClientRect();
            node.style.position = 'absolute';
            node.style.width = width;
            node.style.height = height;
            add_transform(node, a);
        }
    }
    function add_transform(node, a) {
        const b = node.getBoundingClientRect();
        if (a.left !== b.left || a.top !== b.top) {
            const style = getComputedStyle(node);
            const transform = style.transform === 'none' ? '' : style.transform;
            node.style.transform = `${transform} translate(${a.left - b.left}px, ${a.top - b.top}px)`;
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function fix_and_outro_and_destroy_block(block, lookup) {
        block.f();
        outro_and_destroy_block(block, lookup);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                start_hydrating();
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            end_hydrating();
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.3' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\UI\Header.svelte generated by Svelte v3.38.3 */

    const file = "src\\UI\\Header.svelte";

    function create_fragment(ctx) {
    	let header;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	const block = {
    		c: function create() {
    			header = element("header");
    			if (default_slot) default_slot.c();
    			attr_dev(header, "class", "svelte-jqfzcs");
    			toggle_class(header, "dark-img", /*theme*/ ctx[0] === "dark");
    			toggle_class(header, "light-img", /*theme*/ ctx[0] === "light");
    			add_location(header, file, 26, 0, 454);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);

    			if (default_slot) {
    				default_slot.m(header, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], !current ? -1 : dirty, null, null);
    				}
    			}

    			if (dirty & /*theme*/ 1) {
    				toggle_class(header, "dark-img", /*theme*/ ctx[0] === "dark");
    			}

    			if (dirty & /*theme*/ 1) {
    				toggle_class(header, "light-img", /*theme*/ ctx[0] === "light");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Header", slots, ['default']);
    	let { theme } = $$props;
    	const writable_props = ["theme"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("theme" in $$props) $$invalidate(0, theme = $$props.theme);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ theme });

    	$$self.$inject_state = $$props => {
    		if ("theme" in $$props) $$invalidate(0, theme = $$props.theme);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [theme, $$scope, slots];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { theme: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*theme*/ ctx[0] === undefined && !("theme" in props)) {
    			console.warn("<Header> was created without expected prop 'theme'");
    		}
    	}

    	get theme() {
    		throw new Error("<Header>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set theme(value) {
    		throw new Error("<Header>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\UI\Heading.svelte generated by Svelte v3.38.3 */

    const file$1 = "src\\UI\\Heading.svelte";

    // (27:2) {:else}
    function create_else_block(ctx) {
    	let img;
    	let img_src_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			img = element("img");
    			if (img.src !== (img_src_value = "/images/icon-moon.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			add_location(img, file$1, 26, 9, 472);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);

    			if (!mounted) {
    				dispose = listen_dev(img, "click", /*click_handler_1*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(27:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (25:2) {#if theme === "dark"}
    function create_if_block(ctx) {
    	let img;
    	let img_src_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			img = element("img");
    			if (img.src !== (img_src_value = "/images/icon-sun.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			add_location(img, file$1, 25, 4, 411);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);

    			if (!mounted) {
    				dispose = listen_dev(img, "click", /*click_handler*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(25:2) {#if theme === \\\"dark\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let h1;
    	let t1;

    	function select_block_type(ctx, dirty) {
    		if (/*theme*/ ctx[0] === "dark") return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "TODO";
    			t1 = space();
    			if_block.c();
    			attr_dev(h1, "class", "svelte-17fxdzk");
    			add_location(h1, file$1, 23, 2, 366);
    			attr_dev(div, "class", "heading svelte-17fxdzk");
    			add_location(div, file$1, 22, 0, 341);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			if_block.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Heading", slots, []);
    	let { theme } = $$props;
    	const writable_props = ["theme"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Heading> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function click_handler_1(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("theme" in $$props) $$invalidate(0, theme = $$props.theme);
    	};

    	$$self.$capture_state = () => ({ theme });

    	$$self.$inject_state = $$props => {
    		if ("theme" in $$props) $$invalidate(0, theme = $$props.theme);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [theme, click_handler, click_handler_1];
    }

    class Heading extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { theme: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Heading",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*theme*/ ctx[0] === undefined && !("theme" in props)) {
    			console.warn("<Heading> was created without expected prop 'theme'");
    		}
    	}

    	get theme() {
    		throw new Error("<Heading>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set theme(value) {
    		throw new Error("<Heading>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\UI\Input.svelte generated by Svelte v3.38.3 */

    const file$2 = "src\\UI\\Input.svelte";

    function create_fragment$2(ctx) {
    	let span;
    	let div1;
    	let div0;
    	let t;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			span = element("span");
    			div1 = element("div");
    			div0 = element("div");
    			t = space();
    			input = element("input");
    			attr_dev(div0, "class", "front svelte-1bgiaac");
    			add_location(div0, file$2, 68, 4, 1378);
    			attr_dev(div1, "class", "svelte-1bgiaac");
    			toggle_class(div1, "light-input-bg", /*theme*/ ctx[0] === "light");
    			toggle_class(div1, "dark-input-bg", /*theme*/ ctx[0] === "dark");
    			add_location(div1, file$2, 64, 2, 1273);
    			attr_dev(input, "autocomplete", "off");
    			attr_dev(input, "autocapitalize", "off");
    			input.value = /*value*/ ctx[1];
    			attr_dev(input, "placeholder", "Create a new todo...");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "name", "");
    			attr_dev(input, "id", "");
    			attr_dev(input, "class", "svelte-1bgiaac");
    			toggle_class(input, "light-input-bg", /*theme*/ ctx[0] === "light");
    			toggle_class(input, "dark-input-bg", /*theme*/ ctx[0] === "dark");
    			add_location(input, file$2, 70, 2, 1413);
    			attr_dev(span, "class", "svelte-1bgiaac");
    			add_location(span, file$2, 63, 0, 1263);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, div1);
    			append_dev(div1, div0);
    			append_dev(span, t);
    			append_dev(span, input);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_handler*/ ctx[2], false, false, false),
    					listen_dev(input, "keydown", /*keydown_handler*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*theme*/ 1) {
    				toggle_class(div1, "light-input-bg", /*theme*/ ctx[0] === "light");
    			}

    			if (dirty & /*theme*/ 1) {
    				toggle_class(div1, "dark-input-bg", /*theme*/ ctx[0] === "dark");
    			}

    			if (dirty & /*value*/ 2 && input.value !== /*value*/ ctx[1]) {
    				prop_dev(input, "value", /*value*/ ctx[1]);
    			}

    			if (dirty & /*theme*/ 1) {
    				toggle_class(input, "light-input-bg", /*theme*/ ctx[0] === "light");
    			}

    			if (dirty & /*theme*/ 1) {
    				toggle_class(input, "dark-input-bg", /*theme*/ ctx[0] === "dark");
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Input", slots, []);
    	let { theme } = $$props;
    	let { value } = $$props;
    	const writable_props = ["theme", "value"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Input> was created with unknown prop '${key}'`);
    	});

    	function input_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function keydown_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("theme" in $$props) $$invalidate(0, theme = $$props.theme);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    	};

    	$$self.$capture_state = () => ({ theme, value });

    	$$self.$inject_state = $$props => {
    		if ("theme" in $$props) $$invalidate(0, theme = $$props.theme);
    		if ("value" in $$props) $$invalidate(1, value = $$props.value);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [theme, value, input_handler, keydown_handler];
    }

    class Input extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { theme: 0, value: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Input",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*theme*/ ctx[0] === undefined && !("theme" in props)) {
    			console.warn("<Input> was created without expected prop 'theme'");
    		}

    		if (/*value*/ ctx[1] === undefined && !("value" in props)) {
    			console.warn("<Input> was created without expected prop 'value'");
    		}
    	}

    	get theme() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set theme(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\UI\Card.svelte generated by Svelte v3.38.3 */

    const file$3 = "src\\UI\\Card.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "card svelte-wb7jje");
    			add_location(div, file$3, 19, 0, 316);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[0], !current ? -1 : dirty, null, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Card", slots, ['default']);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Card> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Card extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Card",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function scale(node, { delay = 0, duration = 400, easing = cubicOut, start = 0, opacity = 0 } = {}) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const sd = 1 - start;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (_t, u) => `
			transform: ${transform} scale(${1 - (sd * u)});
			opacity: ${target_opacity - (od * u)}
		`
        };
    }

    function flip(node, animation, params = {}) {
        const style = getComputedStyle(node);
        const transform = style.transform === 'none' ? '' : style.transform;
        const scaleX = animation.from.width / node.clientWidth;
        const scaleY = animation.from.height / node.clientHeight;
        const dx = (animation.from.left - animation.to.left) / scaleX;
        const dy = (animation.from.top - animation.to.top) / scaleY;
        const d = Math.sqrt(dx * dx + dy * dy);
        const { delay = 0, duration = (d) => Math.sqrt(d) * 120, easing = cubicOut } = params;
        return {
            delay,
            duration: is_function(duration) ? duration(d) : duration,
            easing,
            css: (_t, u) => `transform: ${transform} translate(${u * dx}px, ${u * dy}px);`
        };
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    let todosList = writable([
      { text: "Gym at morning after 11.", id: 1, completed: true },
      { text: "Breakfast at 11:30", id: 2, completed: false },
      { text: "Study at 1pm", id: 3, completed: false },
      { text: "Play Cricket", id: 4, completed: false },
      { text: "Play Football", id: 5, completed: false },
      { text: "Watching TV", id: 6, completed: false },
      { text: "PUBG", id: 7, completed: false },
    ]);

    const customTodos = {
      subscribe: todosList.subscribe,
      delete: (id) =>
        todosList.update((todos) => todos.filter((todo) => todo.id !== id)),
      add: (text) => {
        let newTodo = {
          text,
          id: Math.random() * 1000,
          completed: false,
        };
        return todosList.update((todos) => [newTodo, ...todos]);
      },
      toggleCompleted: (id) => {
        todosList.update((todos) => {
          let newTodos = [...todos];
          newTodos.forEach((t) => {
            if (t.id === id) {
              t.completed = !t.completed;
            }
          });
          return [...newTodos];
        });
      },
      clearCompleted: () =>
        todosList.update((todos) => todos.filter((t) => !t.completed)),
    };

    /* src\UI\TodoListItem.svelte generated by Svelte v3.38.3 */
    const file$4 = "src\\UI\\TodoListItem.svelte";

    // (112:6) {#if todo.completed}
    function create_if_block$1(ctx) {
    	let img;
    	let img_src_value;
    	let img_transition;
    	let current;

    	const block = {
    		c: function create() {
    			img = element("img");
    			if (img.src !== (img_src_value = "./images/icon-check.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "svelte-330rdz");
    			add_location(img, file$4, 112, 8, 2148);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!img_transition) img_transition = create_bidirectional_transition(img, scale, { duration: 100 }, true);
    				img_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!img_transition) img_transition = create_bidirectional_transition(img, scale, { duration: 100 }, false);
    			img_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    			if (detaching && img_transition) img_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(112:6) {#if todo.completed}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let li;
    	let span0;
    	let div;
    	let t0;
    	let p;
    	let t1_value = /*todo*/ ctx[0].text + "";
    	let t1;
    	let t2;
    	let span1;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*todo*/ ctx[0].completed && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			li = element("li");
    			span0 = element("span");
    			div = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			p = element("p");
    			t1 = text(t1_value);
    			t2 = space();
    			span1 = element("span");
    			attr_dev(div, "class", "svelte-330rdz");
    			toggle_class(div, "tick", /*todo*/ ctx[0].completed);
    			toggle_class(div, "light-list-bg", /*theme*/ ctx[1] === "light" && !/*todo*/ ctx[0].completed);
    			toggle_class(div, "dark-list-bg", /*theme*/ ctx[1] === "dark" && !/*todo*/ ctx[0].completed);
    			add_location(div, file$4, 106, 4, 1934);
    			attr_dev(span0, "class", "add svelte-330rdz");
    			toggle_class(span0, "border", !/*todo*/ ctx[0].completed);
    			add_location(span0, file$4, 101, 2, 1812);
    			attr_dev(p, "class", "svelte-330rdz");
    			toggle_class(p, "completed", /*todo*/ ctx[0].completed);
    			add_location(p, file$4, 119, 2, 2303);
    			attr_dev(span1, "class", "remove svelte-330rdz");
    			add_location(span1, file$4, 120, 2, 2358);
    			attr_dev(li, "class", "svelte-330rdz");
    			add_location(li, file$4, 100, 0, 1804);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, span0);
    			append_dev(span0, div);
    			if (if_block) if_block.m(div, null);
    			append_dev(li, t0);
    			append_dev(li, p);
    			append_dev(p, t1);
    			append_dev(li, t2);
    			append_dev(li, span1);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(span0, "click", /*click_handler*/ ctx[2], false, false, false),
    					listen_dev(span1, "click", /*click_handler_1*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*todo*/ ctx[0].completed) {
    				if (if_block) {
    					if (dirty & /*todo*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (dirty & /*todo*/ 1) {
    				toggle_class(div, "tick", /*todo*/ ctx[0].completed);
    			}

    			if (dirty & /*theme, todo*/ 3) {
    				toggle_class(div, "light-list-bg", /*theme*/ ctx[1] === "light" && !/*todo*/ ctx[0].completed);
    			}

    			if (dirty & /*theme, todo*/ 3) {
    				toggle_class(div, "dark-list-bg", /*theme*/ ctx[1] === "dark" && !/*todo*/ ctx[0].completed);
    			}

    			if (dirty & /*todo*/ 1) {
    				toggle_class(span0, "border", !/*todo*/ ctx[0].completed);
    			}

    			if ((!current || dirty & /*todo*/ 1) && t1_value !== (t1_value = /*todo*/ ctx[0].text + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*todo*/ 1) {
    				toggle_class(p, "completed", /*todo*/ ctx[0].completed);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("TodoListItem", slots, []);
    	let { todo } = $$props;
    	let { theme } = $$props;
    	const writable_props = ["todo", "theme"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<TodoListItem> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => customTodos.toggleCompleted(todo.id);
    	const click_handler_1 = () => customTodos.delete(todo.id);

    	$$self.$$set = $$props => {
    		if ("todo" in $$props) $$invalidate(0, todo = $$props.todo);
    		if ("theme" in $$props) $$invalidate(1, theme = $$props.theme);
    	};

    	$$self.$capture_state = () => ({ scale, fade, todos: customTodos, todo, theme });

    	$$self.$inject_state = $$props => {
    		if ("todo" in $$props) $$invalidate(0, todo = $$props.todo);
    		if ("theme" in $$props) $$invalidate(1, theme = $$props.theme);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [todo, theme, click_handler, click_handler_1];
    }

    class TodoListItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { todo: 0, theme: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TodoListItem",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*todo*/ ctx[0] === undefined && !("todo" in props)) {
    			console.warn("<TodoListItem> was created without expected prop 'todo'");
    		}

    		if (/*theme*/ ctx[1] === undefined && !("theme" in props)) {
    			console.warn("<TodoListItem> was created without expected prop 'theme'");
    		}
    	}

    	get todo() {
    		throw new Error("<TodoListItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set todo(value) {
    		throw new Error("<TodoListItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get theme() {
    		throw new Error("<TodoListItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set theme(value) {
    		throw new Error("<TodoListItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\UI\TodoList.svelte generated by Svelte v3.38.3 */
    const file$5 = "src\\UI\\TodoList.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (30:2) {#each todos as todo (todo.id)}
    function create_each_block(key_1, ctx) {
    	let div;
    	let todolistitem;
    	let t;
    	let div_transition;
    	let rect;
    	let stop_animation = noop;
    	let current;

    	todolistitem = new TodoListItem({
    			props: {
    				theme: /*theme*/ ctx[0],
    				todo: /*todo*/ ctx[3]
    			},
    			$$inline: true
    		});

    	todolistitem.$on("completed", /*completed_handler*/ ctx[2]);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div = element("div");
    			create_component(todolistitem.$$.fragment);
    			t = space();
    			add_location(div, file$5, 30, 4, 682);
    			this.first = div;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(todolistitem, div, null);
    			append_dev(div, t);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const todolistitem_changes = {};
    			if (dirty & /*theme*/ 1) todolistitem_changes.theme = /*theme*/ ctx[0];
    			if (dirty & /*todos*/ 2) todolistitem_changes.todo = /*todo*/ ctx[3];
    			todolistitem.$set(todolistitem_changes);
    		},
    		r: function measure() {
    			rect = div.getBoundingClientRect();
    		},
    		f: function fix() {
    			fix_position(div);
    			stop_animation();
    			add_transform(div, rect);
    		},
    		a: function animate() {
    			stop_animation();
    			stop_animation = create_animation(div, rect, flip, { duration: 300 });
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(todolistitem.$$.fragment, local);

    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, scale, {}, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(todolistitem.$$.fragment, local);
    			if (!div_transition) div_transition = create_bidirectional_transition(div, scale, {}, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(todolistitem);
    			if (detaching && div_transition) div_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(30:2) {#each todos as todo (todo.id)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let ul;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let current;
    	let each_value = /*todos*/ ctx[1];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*todo*/ ctx[3].id;
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(ul, "class", "list svelte-tvh4hh");
    			toggle_class(ul, "light-list-bg", /*theme*/ ctx[0] === "light");
    			toggle_class(ul, "dark-list-bg", /*theme*/ ctx[0] === "dark");
    			toggle_class(ul, "light-text", /*theme*/ ctx[0] === "light");
    			toggle_class(ul, "dark-text", /*theme*/ ctx[0] === "dark");
    			add_location(ul, file$5, 22, 0, 457);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*theme, todos*/ 3) {
    				each_value = /*todos*/ ctx[1];
    				validate_each_argument(each_value);
    				group_outros();
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].r();
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, ul, fix_and_outro_and_destroy_block, create_each_block, null, get_each_context);
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].a();
    				check_outros();
    			}

    			if (dirty & /*theme*/ 1) {
    				toggle_class(ul, "light-list-bg", /*theme*/ ctx[0] === "light");
    			}

    			if (dirty & /*theme*/ 1) {
    				toggle_class(ul, "dark-list-bg", /*theme*/ ctx[0] === "dark");
    			}

    			if (dirty & /*theme*/ 1) {
    				toggle_class(ul, "light-text", /*theme*/ ctx[0] === "light");
    			}

    			if (dirty & /*theme*/ 1) {
    				toggle_class(ul, "dark-text", /*theme*/ ctx[0] === "dark");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("TodoList", slots, []);
    	let { theme } = $$props;
    	let { todos } = $$props;
    	const writable_props = ["theme", "todos"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<TodoList> was created with unknown prop '${key}'`);
    	});

    	function completed_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("theme" in $$props) $$invalidate(0, theme = $$props.theme);
    		if ("todos" in $$props) $$invalidate(1, todos = $$props.todos);
    	};

    	$$self.$capture_state = () => ({ scale, flip, TodoListItem, theme, todos });

    	$$self.$inject_state = $$props => {
    		if ("theme" in $$props) $$invalidate(0, theme = $$props.theme);
    		if ("todos" in $$props) $$invalidate(1, todos = $$props.todos);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [theme, todos, completed_handler];
    }

    class TodoList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { theme: 0, todos: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TodoList",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*theme*/ ctx[0] === undefined && !("theme" in props)) {
    			console.warn("<TodoList> was created without expected prop 'theme'");
    		}

    		if (/*todos*/ ctx[1] === undefined && !("todos" in props)) {
    			console.warn("<TodoList> was created without expected prop 'todos'");
    		}
    	}

    	get theme() {
    		throw new Error("<TodoList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set theme(value) {
    		throw new Error("<TodoList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get todos() {
    		throw new Error("<TodoList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set todos(value) {
    		throw new Error("<TodoList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\UI\Footer.svelte generated by Svelte v3.38.3 */

    const file$6 = "src\\UI\\Footer.svelte";

    function create_fragment$6(ctx) {
    	let footer;
    	let span;
    	let t0;
    	let t1;
    	let t2;
    	let div;
    	let p0;
    	let t4;
    	let p1;
    	let t6;
    	let p2;
    	let t8;
    	let p3;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			footer = element("footer");
    			span = element("span");
    			t0 = text(/*todosLength*/ ctx[0]);
    			t1 = text(" items left");
    			t2 = space();
    			div = element("div");
    			p0 = element("p");
    			p0.textContent = "All";
    			t4 = space();
    			p1 = element("p");
    			p1.textContent = "Active";
    			t6 = space();
    			p2 = element("p");
    			p2.textContent = "Completed";
    			t8 = space();
    			p3 = element("p");
    			p3.textContent = "Clear Completed";
    			add_location(span, file$6, 54, 2, 1124);
    			attr_dev(p0, "class", "svelte-hxmhsu");
    			toggle_class(p0, "active", /*state*/ ctx[4] === "all");
    			add_location(p0, file$6, 62, 4, 1384);
    			attr_dev(p1, "class", "svelte-hxmhsu");
    			toggle_class(p1, "active", /*state*/ ctx[4] === "active");
    			add_location(p1, file$6, 63, 4, 1464);
    			attr_dev(p2, "class", "svelte-hxmhsu");
    			toggle_class(p2, "active", /*state*/ ctx[4] === "completed");
    			add_location(p2, file$6, 66, 4, 1567);
    			attr_dev(div, "class", "states svelte-hxmhsu");
    			toggle_class(div, "light-list-bg", /*theme*/ ctx[1] === "light");
    			toggle_class(div, "dark-list-bg", /*theme*/ ctx[1] === "dark");
    			toggle_class(div, "footer-text-light", /*theme*/ ctx[1] === "dark");
    			toggle_class(div, "footer-text-dark", /*theme*/ ctx[1] === "light");
    			add_location(div, file$6, 55, 2, 1165);
    			add_location(p3, file$6, 73, 2, 1707);
    			attr_dev(footer, "class", "svelte-hxmhsu");
    			toggle_class(footer, "light-list-bg", /*theme*/ ctx[1] === "light");
    			toggle_class(footer, "dark-list-bg", /*theme*/ ctx[1] === "dark");
    			toggle_class(footer, "footer-text-light", /*theme*/ ctx[1] === "dark");
    			toggle_class(footer, "footer-text-dark", /*theme*/ ctx[1] === "light");
    			add_location(footer, file$6, 48, 0, 934);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, footer, anchor);
    			append_dev(footer, span);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(footer, t2);
    			append_dev(footer, div);
    			append_dev(div, p0);
    			append_dev(div, t4);
    			append_dev(div, p1);
    			append_dev(div, t6);
    			append_dev(div, p2);
    			append_dev(footer, t8);
    			append_dev(footer, p3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(p0, "click", /*click_handler*/ ctx[5], false, false, false),
    					listen_dev(p1, "click", /*click_handler_1*/ ctx[6], false, false, false),
    					listen_dev(p2, "click", /*click_handler_2*/ ctx[7], false, false, false),
    					listen_dev(
    						p3,
    						"click",
    						function () {
    							if (is_function(/*clearCompleted*/ ctx[3])) /*clearCompleted*/ ctx[3].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			if (dirty & /*todosLength*/ 1) set_data_dev(t0, /*todosLength*/ ctx[0]);

    			if (dirty & /*state*/ 16) {
    				toggle_class(p0, "active", /*state*/ ctx[4] === "all");
    			}

    			if (dirty & /*state*/ 16) {
    				toggle_class(p1, "active", /*state*/ ctx[4] === "active");
    			}

    			if (dirty & /*state*/ 16) {
    				toggle_class(p2, "active", /*state*/ ctx[4] === "completed");
    			}

    			if (dirty & /*theme*/ 2) {
    				toggle_class(div, "light-list-bg", /*theme*/ ctx[1] === "light");
    			}

    			if (dirty & /*theme*/ 2) {
    				toggle_class(div, "dark-list-bg", /*theme*/ ctx[1] === "dark");
    			}

    			if (dirty & /*theme*/ 2) {
    				toggle_class(div, "footer-text-light", /*theme*/ ctx[1] === "dark");
    			}

    			if (dirty & /*theme*/ 2) {
    				toggle_class(div, "footer-text-dark", /*theme*/ ctx[1] === "light");
    			}

    			if (dirty & /*theme*/ 2) {
    				toggle_class(footer, "light-list-bg", /*theme*/ ctx[1] === "light");
    			}

    			if (dirty & /*theme*/ 2) {
    				toggle_class(footer, "dark-list-bg", /*theme*/ ctx[1] === "dark");
    			}

    			if (dirty & /*theme*/ 2) {
    				toggle_class(footer, "footer-text-light", /*theme*/ ctx[1] === "dark");
    			}

    			if (dirty & /*theme*/ 2) {
    				toggle_class(footer, "footer-text-dark", /*theme*/ ctx[1] === "light");
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(footer);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Footer", slots, []);
    	let { todosLength } = $$props;
    	let { theme } = $$props;
    	let { setState } = $$props;
    	let { clearCompleted } = $$props;
    	let { state } = $$props;
    	const writable_props = ["todosLength", "theme", "setState", "clearCompleted", "state"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => setState("all");
    	const click_handler_1 = () => setState("active");
    	const click_handler_2 = () => setState("completed");

    	$$self.$$set = $$props => {
    		if ("todosLength" in $$props) $$invalidate(0, todosLength = $$props.todosLength);
    		if ("theme" in $$props) $$invalidate(1, theme = $$props.theme);
    		if ("setState" in $$props) $$invalidate(2, setState = $$props.setState);
    		if ("clearCompleted" in $$props) $$invalidate(3, clearCompleted = $$props.clearCompleted);
    		if ("state" in $$props) $$invalidate(4, state = $$props.state);
    	};

    	$$self.$capture_state = () => ({
    		todosLength,
    		theme,
    		setState,
    		clearCompleted,
    		state
    	});

    	$$self.$inject_state = $$props => {
    		if ("todosLength" in $$props) $$invalidate(0, todosLength = $$props.todosLength);
    		if ("theme" in $$props) $$invalidate(1, theme = $$props.theme);
    		if ("setState" in $$props) $$invalidate(2, setState = $$props.setState);
    		if ("clearCompleted" in $$props) $$invalidate(3, clearCompleted = $$props.clearCompleted);
    		if ("state" in $$props) $$invalidate(4, state = $$props.state);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		todosLength,
    		theme,
    		setState,
    		clearCompleted,
    		state,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
    			todosLength: 0,
    			theme: 1,
    			setState: 2,
    			clearCompleted: 3,
    			state: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*todosLength*/ ctx[0] === undefined && !("todosLength" in props)) {
    			console.warn("<Footer> was created without expected prop 'todosLength'");
    		}

    		if (/*theme*/ ctx[1] === undefined && !("theme" in props)) {
    			console.warn("<Footer> was created without expected prop 'theme'");
    		}

    		if (/*setState*/ ctx[2] === undefined && !("setState" in props)) {
    			console.warn("<Footer> was created without expected prop 'setState'");
    		}

    		if (/*clearCompleted*/ ctx[3] === undefined && !("clearCompleted" in props)) {
    			console.warn("<Footer> was created without expected prop 'clearCompleted'");
    		}

    		if (/*state*/ ctx[4] === undefined && !("state" in props)) {
    			console.warn("<Footer> was created without expected prop 'state'");
    		}
    	}

    	get todosLength() {
    		throw new Error("<Footer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set todosLength(value) {
    		throw new Error("<Footer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get theme() {
    		throw new Error("<Footer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set theme(value) {
    		throw new Error("<Footer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get setState() {
    		throw new Error("<Footer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set setState(value) {
    		throw new Error("<Footer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get clearCompleted() {
    		throw new Error("<Footer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set clearCompleted(value) {
    		throw new Error("<Footer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get state() {
    		throw new Error("<Footer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set state(value) {
    		throw new Error("<Footer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.38.3 */
    const file$7 = "src\\App.svelte";

    // (70:2) <Header {theme}>
    function create_default_slot_1(ctx) {
    	let main;
    	let heading;
    	let t;
    	let input;
    	let current;

    	heading = new Heading({
    			props: { theme: /*theme*/ ctx[1] },
    			$$inline: true
    		});

    	heading.$on("click", /*changeTheme*/ ctx[4]);

    	input = new Input({
    			props: {
    				value: /*todoText*/ ctx[2],
    				theme: /*theme*/ ctx[1]
    			},
    			$$inline: true
    		});

    	input.$on("input", /*input_handler*/ ctx[8]);
    	input.$on("keydown", /*addTodo*/ ctx[5]);

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(heading.$$.fragment);
    			t = space();
    			create_component(input.$$.fragment);
    			attr_dev(main, "class", "svelte-il7rwo");
    			add_location(main, file$7, 70, 4, 1511);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(heading, main, null);
    			append_dev(main, t);
    			mount_component(input, main, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const heading_changes = {};
    			if (dirty & /*theme*/ 2) heading_changes.theme = /*theme*/ ctx[1];
    			heading.$set(heading_changes);
    			const input_changes = {};
    			if (dirty & /*todoText*/ 4) input_changes.value = /*todoText*/ ctx[2];
    			if (dirty & /*theme*/ 2) input_changes.theme = /*theme*/ ctx[1];
    			input.$set(input_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(heading.$$.fragment, local);
    			transition_in(input.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(heading.$$.fragment, local);
    			transition_out(input.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(heading);
    			destroy_component(input);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(70:2) <Header {theme}>",
    		ctx
    	});

    	return block;
    }

    // (81:2) <Card>
    function create_default_slot(ctx) {
    	let todolist;
    	let t;
    	let footer;
    	let current;

    	todolist = new TodoList({
    			props: {
    				todos: /*filteredTodos*/ ctx[3],
    				theme: /*theme*/ ctx[1]
    			},
    			$$inline: true
    		});

    	footer = new Footer({
    			props: {
    				todosLength: /*filteredTodos*/ ctx[3].length,
    				clearCompleted: customTodos.clearCompleted,
    				state: /*state*/ ctx[0],
    				setState: /*setState*/ ctx[6],
    				theme: /*theme*/ ctx[1]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(todolist.$$.fragment);
    			t = space();
    			create_component(footer.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(todolist, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(footer, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const todolist_changes = {};
    			if (dirty & /*filteredTodos*/ 8) todolist_changes.todos = /*filteredTodos*/ ctx[3];
    			if (dirty & /*theme*/ 2) todolist_changes.theme = /*theme*/ ctx[1];
    			todolist.$set(todolist_changes);
    			const footer_changes = {};
    			if (dirty & /*filteredTodos*/ 8) footer_changes.todosLength = /*filteredTodos*/ ctx[3].length;
    			if (dirty & /*state*/ 1) footer_changes.state = /*state*/ ctx[0];
    			if (dirty & /*theme*/ 2) footer_changes.theme = /*theme*/ ctx[1];
    			footer.$set(footer_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(todolist.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(todolist.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(todolist, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(footer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(81:2) <Card>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let div;
    	let header;
    	let t;
    	let card;
    	let current;

    	header = new Header({
    			props: {
    				theme: /*theme*/ ctx[1],
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	card = new Card({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(header.$$.fragment);
    			t = space();
    			create_component(card.$$.fragment);
    			attr_dev(div, "class", "root svelte-il7rwo");
    			toggle_class(div, "light-bg", /*theme*/ ctx[1] === "light");
    			toggle_class(div, "dark-bg", /*theme*/ ctx[1] === "dark");
    			add_location(div, file$7, 64, 0, 1388);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(header, div, null);
    			append_dev(div, t);
    			mount_component(card, div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const header_changes = {};
    			if (dirty & /*theme*/ 2) header_changes.theme = /*theme*/ ctx[1];

    			if (dirty & /*$$scope, todoText, theme*/ 518) {
    				header_changes.$$scope = { dirty, ctx };
    			}

    			header.$set(header_changes);
    			const card_changes = {};

    			if (dirty & /*$$scope, filteredTodos, state, theme*/ 523) {
    				card_changes.$$scope = { dirty, ctx };
    			}

    			card.$set(card_changes);

    			if (dirty & /*theme*/ 2) {
    				toggle_class(div, "light-bg", /*theme*/ ctx[1] === "light");
    			}

    			if (dirty & /*theme*/ 2) {
    				toggle_class(div, "dark-bg", /*theme*/ ctx[1] === "dark");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(header);
    			destroy_component(card);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $todos;
    	validate_store(customTodos, "todos");
    	component_subscribe($$self, customTodos, $$value => $$invalidate(7, $todos = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let theme = "dark";
    	let state = "all";
    	let todoText = "";
    	let filteredTodos = [];

    	function changeTheme() {
    		$$invalidate(1, theme = theme === "dark" ? "light" : "dark");
    	}

    	function addTodo(event) {
    		if (event.which !== 13 || todoText.trim().length === 0) {
    			return;
    		}

    		customTodos.add(todoText);
    		$$invalidate(2, todoText = "");
    	}

    	function setState(s) {
    		$$invalidate(0, state = s);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const input_handler = e => $$invalidate(2, todoText = e.target.value);

    	$$self.$capture_state = () => ({
    		Header,
    		Heading,
    		Input,
    		Card,
    		TodoList,
    		Footer,
    		todos: customTodos,
    		theme,
    		state,
    		todoText,
    		filteredTodos,
    		changeTheme,
    		addTodo,
    		setState,
    		$todos
    	});

    	$$self.$inject_state = $$props => {
    		if ("theme" in $$props) $$invalidate(1, theme = $$props.theme);
    		if ("state" in $$props) $$invalidate(0, state = $$props.state);
    		if ("todoText" in $$props) $$invalidate(2, todoText = $$props.todoText);
    		if ("filteredTodos" in $$props) $$invalidate(3, filteredTodos = $$props.filteredTodos);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*state, $todos*/ 129) {
    			 if (state === "active") {
    				$$invalidate(3, filteredTodos = $todos.filter(todo => !todo.completed));
    			} else if (state === "completed") {
    				$$invalidate(3, filteredTodos = $todos.filter(todo => todo.completed));
    			} else {
    				$$invalidate(3, filteredTodos = $todos);
    			}
    		}
    	};

    	return [
    		state,
    		theme,
    		todoText,
    		filteredTodos,
    		changeTheme,
    		addTodo,
    		setState,
    		$todos,
    		input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
