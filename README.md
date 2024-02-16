<a href="https://www.redflagsdating.com/">
  <h1 align="center">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="redflags-180.png">
      <img alt="Red Flags" src="redflags-180.png">
    </picture>
    <div>
      Red Flags Dating App - Cloud Functions
    </div>
  </h1>
</a>

The monorepo source controls features and business logic for Red Flags Dating App powered
by **Firebase Cloud Functions** (Serverless).

- [Technologies](#technology)
- [Folder Structure](#folder-structure)
- [Getting Started](#getting-started)
- [Developer Guide](#developer-guide)

## Technology

- [Firebase](https://firebase.google.com/)
- [Cloud Functions](https://firebase.google.com/docs/functions)
- Typescript (Javascript)
- Jest
- [JDK](https://www.oracle.com/java/technologies/downloads)

## Folder Structure

```yml
    .
    ├── functions/                            # Cloud function workspace
    │   ├── src/                              # All cloud functions
    │   │   ├── index.ts                      # Initialization and export cloud functions
    │   │   ├── add-qod-on-new-connection.ts  # Event-triggered cloud functions (top level)
    │   │   ├── update-connection-on-schedule.ts
    │   │   ├── ...
    │   │   │
    │   │   ├── api/                          # RESTful API cloud functions
    │   │   │   ├── add-qod.ts                # e.g. /addQod?connectionId=Wf84j3we20k3ee
    │   │   │   └── ...
    │   │   │
    │   │   └── __tests__/                    # Jest unit tests
    │   │      ├── add-qod-on-new-connection.test.ts
    │   │      └── ...
    │   │
    │   ├── jest.config.js
    │   │
    │   └── ...
    │
    ├── .firebaserc                       # Define Firebase projects for switching with `firebase use` command. Generated via `firebase init` for the first time.
    ├── firebase.json                     # Describes properties for your project. Use `firebase init` command to update it.
    ├── firestore.indexes.json            # Generate via "firebase init firestore" command
    ├── firestore.rules                   # Generate via "firebase init firestore" command
    └── ...
```

## Getting Started

- [Install](#install)
- [Setup](#setup)
- [Run](#run)

### Install

[Firebase CLI](https://firebase.google.com/docs/cli#install-cli-mac-linux). *(Skip if you already installed while setting up `rfd-app`)*

`zsh` *(Recommended)*

```sh
brew install zsh
```

Add below snippet into `./zshrc` *(Optional)*

```sh
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# place this after nvm initialization!
autoload -U add-zsh-hook
load-nvmrc() {
  local node_version="$(nvm version)"
  local nvmrc_path="$(nvm_find_nvmrc)"

  if [ -n "$nvmrc_path" ]; then
    local nvmrc_node_version=$(nvm version "$(cat "${nvmrc_path}")")

    if [ "$nvmrc_node_version" = "N/A" ]; then
      nvm install
    elif [ "$nvmrc_node_version" != "$node_version" ]; then
      nvm use
    fi
  elif [ "$node_version" != "$(nvm version default)" ]; then
    echo "Reverting to nvm default version"
    nvm use default
  fi
}
add-zsh-hook chpwd load-nvmrc
load-nvmrc
```

`nvm`

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
```

`Node 18.x`

```sh
nvm install 18
nvm use 18
```

`Yarn`

```sh
npm install --global yarn
```

`JDK` (For emulators in dev)

https://www.oracle.com/java/technologies/downloads

### Setup

- *Clone the repo*
- *Log in Firebase*
- *Switch to Firebase default `dev` project*
- *Install dependent packages*
- *Change Git Hooks path*
- *Config `git` user info*

```bash
# Clone the repo
git clone git@github.com:redflagsdating/rfd-cloud-functions.git
```

```bash
# Log in Firebase
firebase login
```

```bash
# Switch to Firebase default `dev` project
firebase use
```

```bash
# Install dependent packages
yarn
```

```bash
# Change Git Hooks path
git config core.hooksPath .githooks/
```

```bash
# Config git user info
git config --global user.name "John Smith"
git config --global user.email john@redflagsdating.com
```

### Run

List monorepo all workspaces

```bash
yarn workspaces info
```

Run `functions` workspace in development mode

```bash
yarn workspace functions serve
```

Run `functions` workspace test

```bash
yarn workspace functions test
```

Deploy `functions` to Firebase

> Sometimes you might encounter timeout or errors, rerun deploy could potentially fix it.

```bash
yarn workspace functions deploy
```


## Developer Guide

- [Emulator](https://firebase.google.com/docs/emulator-suite/install_and_configure)
- [Coding Convention](https://google.github.io/styleguide/jsoncstyleguide.xml#JSON_Structure_&_Reserved_Property_Names)
