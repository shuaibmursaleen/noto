import yargs from "yargs";
import prompts from "@posva/prompts";
import c from "picocolors";

import { hideBin } from "yargs/helpers";

import { dump, load } from "@/storage";
import { getStagedDiff, isGitRepository } from "@/git";
import { generateCommitMessage } from "@/ai";

yargs(hideBin(process.argv))
  .scriptName("noto")
  .usage("$0 [args]")
  .command(
    "config",
    "setup you API key to enable noto.",
    () => {},
    async () => {
      const storage = await load();
      if (storage.apiKey) {
        const response = await prompts({
          type: "confirm",
          name: "reset",
          message: "Do you want to reset your API key?",
        });
        if (!response.reset) {
          console.log(
            `Use ${c.greenBright(
              c.bold("`noto`")
            )} to generate your commit message!`
          );
          return process.exit(0);
        }
      }
      const response = await prompts({
        type: "password",
        name: "apiKey",
        message: "Please enter your API key:",
        validate: (value) => (value ? true : "API key is required!"),
      });
      if (response.apiKey) {
        storage.apiKey = response.apiKey;
        dump();
        console.log("API key saved successfully!");
        console.log(
          `Use ${c.greenBright(
            c.bold("`noto`")
          )} to generate your commit message!`
        );
      }
    }
  )
  .command(
    "*",
    "generate commit message",
    () => {},
    async () => {
      const storage = await load();
      if (!storage.apiKey) {
        console.log(
          `Please run ${c.cyan(c.bold("`noto config`"))} to set your API key.`
        );
        process.exit(1);
      }
      const cwd = process.cwd();
      if (!isGitRepository(cwd)) {
        console.log(
          c.red("Oops! No Git repository found in the current directory.")
        );
        console.log(
          `You can initialize one by running ${c.cyan(c.bold("`git init`"))}`
        );
        process.exit(1);
      }
      const diff = await getStagedDiff();
      if (!diff) {
        console.log(c.red("Oops! No staged changes found to commit."));
        console.log(
          `Stage changes with ${c.cyan(c.bold("`git add <file>`"))} or ${c.cyan(
            c.bold("`git add .`")
          )} for stage all files.`
        );
        process.exit(1);
      }
      const message = await generateCommitMessage(diff);
      console.log(c.white(message));
    }
  )
  .version()
  .alias("-v", "--version")
  .alias("-h", "--help").argv;
