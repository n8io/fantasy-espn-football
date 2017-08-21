# 🏈 fantasy-espn-football
A page scraping utility for TLEOI

## What you'll find

### 🗂 `data` directory
Here you will find all the scraped data for the listed season(s) and league id(s). [[view data](./data)]

[![example](./img/example-data.png)](./data)

### 📁 `src` directory
This is all the nodejs code that was used to login and pull the data

## Getting started

### Requirements

* ![](https://www.google.com/s2/favicons?domain=nodejs.org) [Node v8+](https://nodejs.org/en/)
* ![](https://www.google.com/s2/favicons?domain=yarnpkg.com) [Yarn v0.27+](https://yarnpkg.com/en/)

### ⇢ `cp .env.example .env`
Copies example environment file to `./.env`. Fill out the values accordingly as they are **required** to run.

### 📦 `yarn install`
Installs dependencies needed to run

## Running the scraper

### 🚛 `yarn start`
Run the scraper for the configured league and season. Outputs the data into the `./data` accordingly.

## Development

### 🤓 `yarn dev`
Runs the scraper and watches the `src` directory for changes, then reruns.
