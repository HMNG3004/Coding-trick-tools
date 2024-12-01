using System;
using System.IO;

public class GenerateTreeFolder
{
    public static void PrintFolderTree(string rootPath, string indent = "", int currentDepth = 1, int maxDepth = 3)
    {
        // Check if the root path exists
        if (!Directory.Exists(rootPath))
        {
            Console.WriteLine($"The directory '{rootPath}' does not exist.");
            return;
        }

        if (currentDepth > maxDepth)
            return;

        // Get all subdirectories
        var directories = Directory.GetDirectories(rootPath);

        int childCount = 0;
        foreach (var dir in directories)
        {
            if (Path.GetFileName(dir).StartsWith("."))
                continue;

            if (childCount < 2)
            {
                Console.WriteLine($"{indent}├── {Path.GetFileName(dir)}");

                // Recursively print the subdirectory tree
                PrintFolderTree(dir, indent + "│   ", currentDepth + 1, maxDepth);
            }
            childCount++;
        }

        // Print "..." if there are more than 2 directories
        if (directories.Length > 2)
        {
            Console.WriteLine($"{indent}└── ...");
        }

        // Optionally, print files if not at the max depth
        if (currentDepth < maxDepth)
        {
            var files = Directory.GetFiles(rootPath);
            foreach (var file in files)
            {
                if (!Path.GetFileName(file).StartsWith("."))
                {
                    Console.WriteLine($"{indent}├── {Path.GetFileName(file)}");
                }
            }
        }
    }

    static void Main(string[] args)
    {
        Console.WriteLine("Enter the directory path:");
        string rootPath = Console.ReadLine();  // Read the directory path from user input

        // Check if the directory exists
        if (Directory.Exists(rootPath))
        {
            // Print the folder tree with a depth limit
            Console.WriteLine($"Folder tree for: {rootPath}");
            PrintFolderTree(rootPath, maxDepth: 3);
            Console.WriteLine("\nFolder tree generated successfully!");
        }
        else
        {
            // If the directory does not exist, display an error message
            Console.WriteLine("The specified directory does not exist.");
        }
    }
}
