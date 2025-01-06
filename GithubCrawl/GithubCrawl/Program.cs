using System.Diagnostics;
using System.Text.Json;
using Octokit;

public class GithubCrawl
{
    private static readonly GitHubClient client = new GitHubClient(new ProductHeaderValue("GitHubRepoInfo"));
    public static async Task Main()
    {
        var config = JsonDocument.Parse(File.ReadAllText("appsettings.json"));
        string token = config.RootElement.GetProperty("GitHubToken").GetString();
        client.Credentials = new Credentials(token);
        try
        {
            Console.Write("Input github account: ");
            string githubUsername = "";
            githubUsername = Console.ReadLine();
            if (githubUsername == "" || githubUsername == null)
            {
                bool valid = false;
                while (!valid)
                {
                    Console.Write("Please input a valid github account: ");
                    githubUsername = Console.ReadLine();
                }
            }
            else
            {
                var stopwatch = Stopwatch.StartNew();

                client.Credentials = new Credentials(token);

                var getReposTask = GetRepository(githubUsername);
                var getStarredTask = GetStarredRepos(githubUsername);
                var getGist = GetGists(githubUsername);

                await Task.WhenAll(getReposTask, getStarredTask, getGist);

                stopwatch.Stop();
                Console.WriteLine($"Time taken: {stopwatch.ElapsedMilliseconds} ms");
            }

        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
        }
    }

    public static async Task GetRepository(string githubUsername)
    {
        Console.WriteLine("Getting repository information...");
        var repositories = await client.Repository.GetAllForUser(githubUsername);

        Console.WriteLine($"Total repositories for {githubUsername}: {repositories.Count}");
    }

    public static async Task GetStarredRepos(string githubUsername)
    {
        Console.WriteLine("Getting starred repositories...");

        var allStarredRepos = new List<Repository>();
        int currentPage = 1;
        int pageSize = 100;

        while (true)
        {
            var apiOptions = new ApiOptions
            {
                PageSize = pageSize,
                PageCount = 1,
                StartPage = currentPage
            };

            var starredRepos = await client.Activity.Starring.GetAllForUser(githubUsername, apiOptions);

            if (starredRepos.Count == 0)
                break;

            allStarredRepos.AddRange(starredRepos);
            currentPage++;
        }
        Console.WriteLine($"Total starred repositories: {allStarredRepos.Count}");
    }

    public static async Task GetGists(string githubUsername)
    {
        Console.WriteLine("Getting gist information...");
        var gists = await client.Gist.GetAllForUser(githubUsername);

        Console.WriteLine($"Total gists for {githubUsername}: {gists.Count}");
    }
}