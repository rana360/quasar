const trailingSlashRE = /\/?$/

function equals (current, target) {
  if (Object.keys(current).length !== Object.keys(target).length) {
    return false
  }

  // route query and params are strings when read from URL
  for (const key in target) {
    if (!(key in current) || String(current[key]) !== String(target[key])) {
      return false
    }
  }
  return true
}

function includes (current, target) {
  for (const key in target) {
    if (!(key in current)) {
      return false
    }
  }
  return true
}

function isSameRoute (current, target) {
  if (!target) {
    return false
  }

  if (current.path && target.path) {
    return (
      current.path.replace(trailingSlashRE, '') === target.path.replace(trailingSlashRE, '') &&
      current.hash === target.hash &&
      equals(current.query, target.query)
    )
  }

  return typeof current.name === 'string' &&
    current.name === target.name &&
    current.hash === target.hash &&
    equals(current.query, target.query) === true &&
    equals(current.params, target.params) === true
}

function isIncludedRoute (current, target) {
  return current.path.replace(trailingSlashRE, '/').indexOf(target.path.replace(trailingSlashRE, '/')) === 0 &&
    (typeof target.hash !== 'string' || target.hash.length < 2 || current.hash === target.hash) &&
    includes(current.query, target.query) === true
}

export const routerLinkProps = {
  // router-link
  to: [String, Object],
  exact: Boolean,
  append: Boolean,
  replace: Boolean,
  activeClass: {
    type: String,
    default: 'q-router-link--active'
  },
  exactActiveClass: {
    type: String,
    default: 'q-router-link--exact-active'
  },

  // regular <a> link
  href: String,
  target: String,

  // state
  disable: Boolean
}

// external props: type, tag
// external: fallbackTag

export default {
  props: routerLinkProps,

  computed: {
    hasHrefLink () {
      return this.disable !== true && this.href !== void 0
    },

    hasRouterLinkProps () {
      return this.$router !== void 0 &&
        this.disable !== true &&
        this.hasHrefLink !== true &&
        this.to !== void 0 && this.to !== null && this.to !== ''
    },

    resolvedLink () {
      return this.hasRouterLinkProps === true
        ? this.__resolveLink(this.to, this.append)
        : null
    },

    hasRouterLink () {
      return this.resolvedLink !== null
    },

    hasLink () {
      return this.hasHrefLink === true || this.hasRouterLink === true
    },

    linkTag () {
      return this.type === 'a' || this.hasLink === true
        ? 'a'
        : (this.tag || this.fallbackTag || 'div')
    },

    linkAttrs () {
      return this.hasHrefLink === true
        ? {
          href: this.href,
          target: this.target
        }
        : (
          this.hasRouterLink === true
            ? {
              href: this.resolvedLink.href,
              target: this.target
            }
            : {}
        )
    },

    linkIsActive () {
      return this.hasRouterLink === true &&
        isIncludedRoute(this.$route, this.resolvedLink.route)
    },

    linkIsExactActive () {
      return this.hasRouterLink === true &&
        isSameRoute(this.$route, this.resolvedLink.route)
    },

    linkClass () {
      return this.hasRouterLink === true
        ? (
          this.linkIsExactActive === true
            ? ` ${this.exactActiveClass} ${this.activeClass}`
            : (
              this.exact === true
                ? ''
                : (this.linkIsActive === true ? ` ${this.activeClass}` : '')
            )
        )
        : ''
    }
  },

  methods: {
    __resolveLink (to, append) {
      // we protect from accessing this.$route without
      // actually needing it so that we won't trigger
      // unnecessary updates in computed props using this method
      try {
        const route = append === true
          ? this.$router.resolve(to, this.$route, true)
          : this.$router.resolve(to)

        if (route) { return route }
      }
      catch (_) {}

      return null
    },

    /**
     * @returns false | Promise<RouterLocation|RouterError> | Promise<RouterLocation|void>
     */
    __navigateToRouterLink (e, fromGoFn, returnRouterError) {
      // should match RouterLink from Vue Router
      if (
        // component is not disabled
        this.disable === true ||

        // don't redirect with control keys
        e.metaKey || e.altKey || e.ctrlKey || e.shiftKey ||

        // don't redirect when e.navigate is set to false in userland
        // ...unless calling go() from @click(e, go)
        (fromGoFn !== true && e.defaultPrevented === true) ||

        // don't redirect on right click
        (e.button !== void 0 && e.button !== 0) ||

        // don't redirect if it should open in a new window
        this.target === '_blank'
      ) {
        return false
      }

      e.preventDefault()

      const promise = this.$router[this.replace === true ? 'replace' : 'push'](this.resolvedLink.location)

      return returnRouterError === true
        ? promise
        : promise.catch(() => {})
    }
  }
}
