# Security Policy

## Supported versions

The latest published minor of `shardlight` receives security fixes.

## Reporting a vulnerability

Please **do not** open a public issue for a security problem. Instead, use GitHub's private
reporting:

1. Go to <https://github.com/jukrapopk/shardlight/security/advisories/new>, or
2. Email <jukrapopk@gmail.com> with a description and, if possible, a minimal reproduction.

You can expect an acknowledgement within a few days and a coordinated fix and disclosure.

## Scope

`shardlight` runs in the browser and has no server component. It reads a config object and
draws images/canvas/three.js objects; it performs no network requests of its own. The most
relevant classes of issue are cross-site scripting via unvalidated input reaching the DOM, or
denial of service from unbounded bake sizes. Reports along those lines are welcome.
