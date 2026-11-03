// Rebuilds the "Daily activity" block in README.md from the GitHub contribution calendar.
import { readFileSync, writeFileSync } from "node:fs";

const USER = "Alexei-Krivchikov";
const token = process.env.GH_TOKEN;
if (!token) throw new Error("GH_TOKEN is not set");

const query = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query, variables: { login: USER } }),
});
const json = await res.json();
if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors ?? res.status));

const cal = json.data.user.contributionsCollection.contributionCalendar;
const days = cal.weeks.flatMap((w) => w.contributionDays); // oldest -> newest

// Current streak: count back from today; an empty today doesn't break it yet.
let i = days.length - 1;
if (days[i].contributionCount === 0) i--;
let streak = 0;
for (; i >= 0 && days[i].contributionCount > 0; i--) streak++;

// Longest streak in the last year.
let longest = 0;
let run = 0;
for (const d of days) {
  run = d.contributionCount > 0 ? run + 1 : 0;
  longest = Math.max(longest, run);
}

const last30 = days.slice(-30).reduce((sum, d) => sum + d.contributionCount, 0);
const today = new Date().toISOString().slice(0, 10);

const block = `<!--ACTIVITY:START-->
| 🔥 Current streak | 🏆 Longest streak (1 year) | 📆 Last 30 days | 🗓 Last year |
|:---:|:---:|:---:|:---:|
| **${streak} days** | **${longest} days** | **${last30}** contributions | **${cal.totalContributions}** contributions |

<sub>Updated automatically on ${today}</sub>
<!--ACTIVITY:END-->`;

const readme = readFileSync("README.md", "utf8");
const next = readme.replace(/<!--ACTIVITY:START-->[\s\S]*<!--ACTIVITY:END-->/, block);
if (next !== readme) writeFileSync("README.md", next);
console.log({ streak, longest, last30, total: cal.totalContributions });
