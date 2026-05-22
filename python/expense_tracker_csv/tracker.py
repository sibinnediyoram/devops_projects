import csv
import os
from datetime import datetime, date

from constants import CATEGORIES, EXPENSE_FILE, MONTHS
from expense import Expense

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
        file_exists = os.path.exists(EXPENSE_FILE)
        with open(EXPENSE_FILE, mode='a', newline='') as file:
            writer = csv.writer(file)
            if not file_exists:
                writer.writerow(["Date", "Category", "Amount", "Description"])
            writer.writerow(expense.to_csv_row())
        print("\nExpense recorded successfully.")
    except Exception as e:
        print(f"Error occurred while saving expense: {e}")


# Display all recorded expenses
def display_expenses():
    try:
        with open(EXPENSE_FILE, mode='r') as file:
            reader = csv.reader(file)
            next(reader) # Skip header
            print("\nAll Recorded Expenses:")
            for row in reader:
                print(
                    f"{row[0]:15}"
                    f"{row[1]:15}"
                    f"{row[2]:10}"
                    f"{row[3]}"
            )   
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
    use_current_year = input(f"Use current year ({year})? (y/n): ").lower().strip()
    if use_current_year == 'n':
        try:
            year = int(input("Enter year (YYYY): "))
        except ValueError:
            print("Invalid year. Please enter a number.")
            return
    month = f"{year}-{month_choice:02d}"
    total_expenses = 0.0
    try:
        with open(EXPENSE_FILE, mode='r') as file:
            reader = csv.reader(file)
            next(reader) # Skip header
            for row in reader:
                if row[0].startswith(month):
                    total_expenses += float(row[2])
        print(
            f"\nTotal expenses for "
            f"{MONTHS[month_choice - 1]} {year}: "
            f"{total_expenses:.2f} Euros"
        )
    except FileNotFoundError:
        print("No expenses recorded yet.")