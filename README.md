# Gator

Gator is a command-line RSS feed aggregator built with TypeScript, PostgreSQL, Drizzle ORM, and Node.js.

## Requirements

Before running Gator, you need:

* Node.js
* PostgreSQL
* npm
* A PostgreSQL database named `gator`

## Configuration

Create a configuration file at:

`~/.gatorconfig.json`

The file should contain:

```json
{
  "db_url": "postgres://postgres:postgres@localhost:5432/gator?sslmode=disable"
}
```

Gator stores the currently logged-in user in this file when you use the `login` command.

## Running Gator

Install the dependencies:

```bash
npm install
```

Start Gator with:

```bash
npm run start <command>
```

## Commands

Some available commands include:

* `register <username>` - Create a new user.
* `login <username>` - Log in as an existing user.
* `users` - List all users.
* `addfeed <name> <url>` - Add an RSS feed and follow it.
* `feeds` - List all feeds.
* `follow <url>` - Follow an existing feed.
* `following` - List the feeds the current user follows.
* `unfollow <url>` - Unfollow a feed.
* `agg <duration>` - Continuously fetch RSS feeds, for example `agg 1m`.
* `browse [limit]` - Show the latest posts. The default limit is 2.

Example:

```bash
npm run start register alice
npm run start login alice
npm run start addfeed "Hacker News RSS" "https://hnrss.org/newest"
npm run start agg 1m
npm run start browse
```

