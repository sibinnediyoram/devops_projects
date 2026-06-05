class Expense:
    def __init__(self, expense_date, category, amount, description=""):
        """
        Create a new Expense object.

        self means:
        this specific expense instance.
        """
        self.expense_date = expense_date
        self.category = category
        self.amount = amount
        self.description = description

    def to_csv_row(self):
        """
        Convert object into CSV row format.
        """
        return [self.expense_date, self.category, f"{self.amount:.2f}", self.description]
    
    def __str__(self):
        """
        Define how object looks when printed.
        """

        return (
            f"{self.expense_date} | "
            f"{self.category} | "
            f"{self.amount:.2f} EUR | "
            f"{self.description}"
        )