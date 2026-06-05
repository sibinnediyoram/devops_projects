# Monthly Expense Tracker

A command-line expense tracker written in Python. Log daily expenses by category, view your spending history, and calculate monthly totals — all stored locally in a sqlite3 DB with no external dependencies.

## Features

- Add expenses with date, category, amount, and an optional description
- View all recorded expenses in a formatted table
- Calculate total spending for any month and year
- Data persisted locally in `expenses.csv`

## Requirements

- Python 3.x (no third-party packages required)

## Usage

```bash
python main.py
```

You will be presented with a menu:

```
Monthly Expense Tracker
1. Add a new expense
2. View all expenses
3. Calculate monthly total
4. Exit
```

### Adding an expense

Select option `1`. You will be prompted to:

1. Choose a category from the list
2. Enter the amount (in EUR)
3. Use today's date or provide a custom date (`YYYY-MM-DD`)
4. Enter an optional description

### Viewing expenses

Select option `2` to print all recorded expenses.

### Monthly total

Select option `3`, then choose a month and year to see the total spending for that period.

## Categories

| # | Category      |
|---|---------------|
| 1 | rent          |
| 2 | internet      |
| 3 | groceries     |
| 4 | gas           |
| 5 | electricity   |
| 6 | sport         |
| 7 | travel        |
| 8 | entertainment |
| 9 | health        |
|10 | education     |
|11 | other         |

## Data storage

Expenses are saved to `expenses.csv` in the project directory. The file is created automatically on first use. Each row contains:

```
Date,Category,Amount,Description
2026-05-15,rent,1118.00,rent amount for month of may
```

`expenses.csv` should be added to `.gitignore` to avoid committing personal financial data.

## Project structure

```
monthly_expense/
├── main.py        # Entry point and menu loop
├── tracker.py     # Core logic: input, save, display, totals
├── expense.py     # Expense data class
├── constants.py   # Categories, months, file path
└── expenses.csv   # Local data file (auto-generated)
```



Your CV is informative and has all the necessary relevant information. Great job! The rule of thumb in a CV is that a recruiter should get a basic understanding of your background in 10 seconds. You have mainly achieved this in your CV since you have listed your skills, work history, work tasks, and education. I have a few suggestions for you that you could consider. You could consider adding an introductory section to the upper part of your CV. The introduction is often the first thing the recruiter sees, so it is possible to stand out from other applicants by writing a good introduction. It would be good to mention briefly what kind of person you are, what are your primary skills, and what you are trying to achieve in the future. 3-4 sentences are usually a good length for the introduction text.