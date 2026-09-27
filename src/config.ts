import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export type Config = {
  dbUrl: string;
  currentUserName?: string;
};

function getConfigFilePath(): string {
  return join(homedir(), ".gatorconfig.json");
}

function writeConfig(cfg: Config): void {
  const rawConfig = {
    db_url: cfg.dbUrl,
    current_user_name: cfg.currentUserName,
  };

  writeFileSync(
    getConfigFilePath(),
    JSON.stringify(rawConfig, null, 2)
  );
}

function validateConfig(rawConfig: any): Config {
  if (typeof rawConfig.db_url !== "string") {
    throw new Error("Invalid config: db_url must be a string");
  }

  if (
    rawConfig.current_user_name !== undefined &&
    typeof rawConfig.current_user_name !== "string"
  ) {
    throw new Error(
      "Invalid config: current_user_name must be a string"
    );
  }

  return {
    dbUrl: rawConfig.db_url,
    currentUserName: rawConfig.current_user_name,
  };
}

export function readConfig(): Config {
  const configFilePath = getConfigFilePath();
  const fileContents = readFileSync(configFilePath, "utf-8");
  const rawConfig = JSON.parse(fileContents);

  return validateConfig(rawConfig);
}

export function setUser(username: string): void {
  const config = readConfig();

  config.currentUserName = username;

  writeConfig(config);
}
