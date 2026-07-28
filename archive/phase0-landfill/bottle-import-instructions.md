# How to Import Bottles into the System

## Step 1: Prepare Your Excel File

Create an Excel file (.xlsx or .xls) with the following columns (column names are case-insensitive):

### Required Columns:
- **Barcode** or **barcode_number** - The barcode number of the bottle
- **Serial Number** or **serial_number** - The serial number of the bottle
- **Product Code** or **product_code** - The product code (e.g., BAR300)

### Optional Columns:
- **Description** - Description of the bottle
- **Gas Type** or **gas_type** or **Group** - The gas type (e.g., ARGON, OXYGEN)
- **Category** - The category (e.g., INDUSTRIAL CYLINDERS)
- **Type** - The type of bottle
- **Ownership** - Who owns the bottle (e.g., WeldCor)
- **Customer** or **customer_name** - Customer name if assigned
- **CustomerListID** or **customer_list_id** - Customer ID if assigned
- **Location** - Where the bottle is located
- **Days At Location** or **days_at_location** - How many days at current location

## Step 2: Use the Template

A template file `bottle-import-template.csv` has been created with your bottles:
- 685922677 (BAR300 - ARGON)
- 660323785 (BAR300 - ARGON)  
- 677777777 (BAR300 - ARGON)

## Step 3: Convert CSV to Excel

Since the upload only accepts .xlsx or .xls files:
1. Open `bottle-import-template.csv` in Excel
2. Click **File** → **Save As**
3. Choose **Excel Workbook (*.xlsx)** as the file type
4. Save as `bottle-import-template.xlsx`

## Step 4: Upload to the System

1. Go to web app: `http://localhost:5174/bottle-management`
2. Click the **Upload** button (upload icon in top right)
3. Select your `bottle-import-template.xlsx` file
4. Review the preview (first 5 rows will be shown)
5. Click **Upload** to import

## Step 5: Verify Import

After upload:
1. The bottles should appear in the Bottle Management page
2. Go to Import Approvals page: `http://localhost:5174/import-approvals`
3. The Category, Group, and Type information should now display correctly
4. Scanned bottles should now match with imported invoices

## Notes:

- The system will automatically set status to 'available' for bottles without a customer
- The system will automatically set status to 'rented' for bottles assigned to a customer
- Duplicate bottles (same barcode) will be skipped automatically
- New customers found in the file will be created automatically

