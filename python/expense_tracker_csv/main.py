"""This is a simple monthly expense tracker that allows users to input their expenses and saves them to a CSV file written in Python by Sibin John.
The program provides options to add new expenses, view all recorded expenses, and calculate total expenses for a selected month. 
It also includes error handling for invalid inputs and file operations."""
from constants import CATEGORIES, EXPENSE_FILE, MONTHS
from tracker import save_expense, display_expenses, monthly_total, get_expense_input

# Main function to run the expense tracker
def main():
    while True:
        print("\nMonthly Expense Tracker")
        print("1. Add a new expense")
        print("2. View all expenses")
        print("3. Calculate monthly total")
        print("4. Exit")
        choice = input("Choose an option: ")
        
        if choice == '1':
            expense = get_expense_input()
            if expense is None:
                continue
            save_expense(*expense.to_csv_row())
        elif choice == '2':
            display_expenses()
        elif choice == '3':
            monthly_total()
        elif choice == '4':
            print("Exiting...")
            break
        else:
            print("Invalid option. Please try again.")

# Run the main function when the script is executed
if __name__ == "__main__": 
    main()