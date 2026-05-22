from datetime import datetime, date

from constants import CATEGORIES, MONTHS
from expense import Expense
from database import (
    insert_expense,
    fetch_all_expenses,
    fetch_monthly_total
)
from logger_config import logger

# Get user input for a new expense and validate it
def get_expense_input():
    print("\nAvailable Categories:")
    for index, category in enumerate(CATEGORIES, start=1):
        print(f"{index}. {category}")

    try:
        category_choice = int(input("Choose category number: "))
        if category_choice < 1 or category_choice > len(CATEGORIES):
            print("Invalid category number.")
            return None
        category = CATEGORIES[category_choice - 1]
    except ValueError:
        print("Invalid input. Please enter a number.")
        return None
    
    try:
        amount = float(input("Enter expense amount: "))
    except ValueError:
        print("Invalid amount. Please enter a number.")
        return None
    
    expense_date = str(date.today())
    use_today = input("Use today's date? (y/n): ").lower().strip()

    if use_today == 'n':
        expense_date = input("Enter expense date (YYYY-MM-DD): ")
        try:
            datetime.strptime(expense_date, "%Y-%m-%d")
        except ValueError:
            print("Invalid date format. Use YYYY-MM-DD")
            return None
    description = input("Enter expense description (optional): ")
    return Expense(
        expense_date, 
        category, 
        amount, 
        description
        )

# Save the expense to a CSV file
def save_expense(expense):
    try:
        insert_expense(expense)
        print("\nExpense recorded successfully.")
        logger.info(f"Expense successfully recorded: {expense}")
    except Exception as e:
        print(f"Error occurred while saving expense: {e}")
        logger.error(f"Error occurred while saving expense: {e}")

# Display all recorded expenses
def display_expenses():
    try:
        expenses = fetch_all_expenses()
        print("\nAll Recorded Expenses:")
        for expense in expenses:
            print(expense)
    except FileNotFoundError:
        print("No expenses recorded yet.")


# Calculate and display total expenses for a selected month
def monthly_total():
    print("\nMonth to select for total expenses:")
    for index, month in enumerate(MONTHS, start=1):
        print(f"{index}. {month}")
    try:
        month_choice = int(input("Select month: "))
        if month_choice < 1 or month_choice > 12:
            print("Invalid month choice.")
            return

    except ValueError:
        print("Invalid input. Please enter a number.")
        return
    
    year = date.today().year
    use_current_year = input(
        f"Use current year ({year})? (y/n): "
        ).lower().strip()
    if use_current_year == 'n':
        try:
            year = int(input("Enter year (YYYY): "))
        except ValueError:
            print("Invalid year. Please enter a number.")
            return
    month = f"{year}-{month_choice:02d}"
    try:
        total_expenses = fetch_monthly_total(month)
        print(
            f"\nTotal expenses for "
            f"{MONTHS[month_choice - 1]} {year}: "
            f"{total_expenses:.2f} Euros"
        )
        logger.info(f"Monthly total calculated for {month}: {total_expenses:.2f} Euros")
    except Exception as e:
        print(f"Error calculating monthly total: {e}")
        logger.error(f"Error calculating monthly total: {e}")