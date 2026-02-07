$word = New-Object -ComObject Word.Application
$word.Visible = $false

$doc = $word.Documents.Add()
$selection = $word.Selection

# Title
$selection.Font.Size = 28
$selection.Font.Bold = $true
$selection.TypeText("10-WEEK DAILY ACTIVITY LOG`n")
$selection.ParagraphFormat.Alignment = 1  # Center alignment
$selection.TypeParagraph()

# Subtitle
$selection.Font.Size = 12
$selection.Font.Bold = $true
$selection.TypeText("Hotel Booking Order Management System Development`n")
$selection.TypeText("Timeline: November 29, 2025 – February 6, 2026 | Work Schedule: 6 days per week`n")
$selection.TypeParagraph()

# Week 1-2
$selection.Font.Size = 14
$selection.Font.Bold = $true
$selection.TypeText("WEEK 1-2: FOUNDATION & INITIAL SETUP (Nov 29 – Dec 12)`n")
$selection.TypeParagraph()

# Create table
$range = $selection.Range
$table1 = $doc.Tables.Add($range, 13, 3)
$table1.Style = 'Table Grid'
$table1.Rows(1).Range.Font.Bold = $true

# Headers
$table1.Cell(1,1).Range.Text = "Date"
$table1.Cell(1,2).Range.Text = "Activity Summary"
$table1.Cell(1,3).Range.Text = "Related Component(s)"

# Data for Week 1-2
$data = @(
    @("2025-11-29 (Sat)", "Project kickoff: reviewed requirements and architecture. Set up development environment.", "Hoteladmin"),
    @("2025-12-01 (Mon)", "Created Hoteladmin UI skeleton with listing page and navigation.", "Hoteladmin / Frontend"),
    @("2025-12-02 (Tue)", "Implemented search and filter functionality in Hoteladmin.", "Hoteladmin / Frontend"),
    @("2025-12-03 (Wed)", "Integrated Hoteladmin with backend API endpoints. Debugged CORS.", "Hoteladmin / Routes"),
    @("2025-12-04 (Thu)", "Code review: Hoteladmin components. Updated styling.", "Hoteladmin"),
    @("2025-12-05 (Fri)", "Wrote unit tests for Hoteladmin and improved error handling.", "Hoteladmin / Testing"),
    @("2025-12-06 (Sat)", "Deployed Hoteladmin to staging. Executed smoke tests.", "Hoteladmin / Deployment"),
    @("2025-12-08 (Mon)", "Initialized Superadmin dashboard project structure.", "Superadmin"),
    @("2025-12-09 (Tue)", "Implemented role-based access control in Superadmin.", "Superadmin / Auth"),
    @("2025-12-10 (Wed)", "Built user management table with pagination and sorting.", "Superadmin"),
    @("2025-12-11 (Thu)", "Connected Superadmin user actions to backend routes.", "Superadmin / Routes"),
    @("2025-12-12 (Fri)", "Fixed Superadmin user role editing. Added validation.", "Superadmin")
)

for ($i = 0; $i -lt $data.Count; $i++) {
    $table1.Cell($i + 2, 1).Range.Text = $data[$i][0]
    $table1.Cell($i + 2, 2).Range.Text = $data[$i][1]
    $table1.Cell($i + 2, 3).Range.Text = $data[$i][2]
}

# Save document
$docPath = "d:\hotel-booking-order-management-system\10-Week-Activity-Log.docx"
$doc.SaveAs([ref] $docPath)
$doc.Close()
$word.Quit()

Write-Host "Document created successfully: 10-Week-Activity-Log.docx"
