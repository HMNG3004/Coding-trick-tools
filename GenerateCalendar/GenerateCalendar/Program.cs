using System.Globalization;
using System.Text;

public class Program
{
    static void Main()
    {
        string markdownCalendar = GenerateMarkdownCalendar();
        Console.WriteLine(markdownCalendar);
    }

    static string GenerateMarkdownCalendar()
    {
        // Get the current date
        DateTime now = DateTime.Now;
        int year = now.Year;
        int month = now.Month;

        // Get the first day of the month and the number of days in the month
        DateTime firstDayOfMonth = new DateTime(year, month, 1);
        int daysInMonth = DateTime.DaysInMonth(year, month);

        // Prepare a calendar grid
        StringBuilder markdownCalendar = new StringBuilder();

        // Add the month and year as a heading
        markdownCalendar.AppendLine($"# {CultureInfo.CurrentCulture.DateTimeFormat.GetMonthName(month)} {year}\n");

        // Add the weekday headers
        string[] daysOfWeek = CultureInfo.CurrentCulture.DateTimeFormat.AbbreviatedDayNames;
        markdownCalendar.AppendLine("| " + string.Join(" | ", daysOfWeek) + " |");
        markdownCalendar.AppendLine("|" + string.Join("|", new string[daysOfWeek.Length].Select(_ => "---")) + "|");

        // Fill in the days of the month
        int currentDayOfWeek = (int)firstDayOfMonth.DayOfWeek;
        int totalCells = daysInMonth + currentDayOfWeek;
        int rows = (int)Math.Ceiling(totalCells / 7.0);

        for (int row = 0; row < rows; row++)
        {
            StringBuilder rowBuilder = new StringBuilder("| ");
            for (int col = 0; col < 7; col++)
            {
                int cellIndex = row * 7 + col;
                if (cellIndex < currentDayOfWeek || cellIndex >= totalCells)
                {
                    rowBuilder.Append("   | ");
                }
                else
                {
                    int day = cellIndex - currentDayOfWeek + 1;
                    rowBuilder.Append($"[{day,2}] | ");
                }
            }
            markdownCalendar.AppendLine(rowBuilder.ToString());
        }

        return markdownCalendar.ToString();
    }
}
