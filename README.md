# Claude mode

Claude Code mods (function-hook plugins that change the Claude Code interface).

## usage-bar

A band above the prompt showing how much is left in your **5-hour** and **weekly** usage
windows, and how long until each one resets:

```
5h ██░░░░░░░░ 24% left · resets in 2h 14m   Week ██████░░░░ 60% left · resets in 3d 3h
```

- The bar turns yellow once a window is 70% used and red at 90%.
- Countdowns refresh every minute; percentages update after each reply.
- The ✕ on the right hides the band. `/usage-bar` shows what it currently reads; `/usage-bar hide` and `/usage-bar show` toggle the band.
- Works on a **Pro or Max** subscription. With an API key there are no windows, so nothing is shown.
  The figures come from the last API response, so the band appears after Claude's first reply.

### Install (permanent, every session)

Add this repo as a plugin marketplace and install the mod:

```sh
claude plugin marketplace add nmeidan/claude-mode.-
claude plugin install usage-bar@claude-mode
```

Or from a local clone (works before this branch is merged):

```sh
git clone -b claude/kind-clarke-c3o3y7 https://github.com/Nmeidan/Claude-mode.- ~/Claude-mode
claude plugin marketplace add ~/Claude-mode
claude plugin install usage-bar@claude-mode
```

### Update

```sh
cd ~/Claude-mode && git pull
claude plugin marketplace update claude-mode
claude plugin update usage-bar@claude-mode
```

Then quit and reopen Claude Code. A `git pull` alone isn't enough: the installed version stays
recorded until `claude plugin update` moves it.

### Try it for one session

```sh
claude --plugin-dir ~/Claude-mode/mods/usage-bar
```

For the desktop app, add the folder to `CLAUDE_CODE_PLUGIN_DIRS` in the `env` block of
`~/.claude/settings.json`.

### Develop

```sh
claude plugin validate mods/usage-bar
claude plugin test mods/usage-bar
```
