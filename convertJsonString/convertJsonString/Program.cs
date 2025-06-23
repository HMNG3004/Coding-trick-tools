using System.Text.Json;

public class Program
{
    public static void Main(string[] args)
    {
        //string currentDirectory = AppDomain.CurrentDomain.BaseDirectory;
        //string filePath = Path.Combine(currentDirectory, "input.txt");

        //if (!File.Exists(filePath))
        //{
        //    Console.WriteLine($"Error: Could not find file '{filePath}'. Ensure the file exists in the output directory.");
        //    return;
        //}

        //string[] mapInput = File.ReadAllLines(filePath);
        //foreach (string item in mapInput)
        //{
        //    Console.WriteLine(item);
        //}

        CreateFileName();
    }

    public static T ParseJson<T>(string jsonString)
    {
        if (string.IsNullOrWhiteSpace(jsonString))
        {
            throw new ArgumentNullException(nameof(jsonString), "JSON string cannot be null or empty");
        }

        try
        {
            // Case-insensitive property matching
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return JsonSerializer.Deserialize<T>(jsonString, options);
        }
        catch (JsonException ex)
        {
            throw new JsonException($"Failed to parse JSON: {ex.Message}", ex);
        }
    }

    public static void CreateFileName()
    {
        string folderPath = @"C:\MyGeneratedFiles";

        // Tạo thư mục nếu chưa tồn tại
        if (!Directory.Exists(folderPath))
            Directory.CreateDirectory(folderPath);

        string[] coinName = ["STG", "NEAR", "LTC", "MANA", "SOL", "TIA", "AAVE", "TRX", "APT", "ADA", "YGG", "OP", "SUI","BTC", "ETH"];

        for (int i = 0; i <= coinName.Length - 1; i++)
        {
            string fileName = $"{coinName[i]}.txt";
            string filePath = Path.Combine(folderPath, fileName);

            string content = "";

            File.WriteAllText(filePath, content);
        }

        Console.WriteLine("Done");
    }
}