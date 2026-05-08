import { Box, Text } from "ink";
import os from "node:os";
import path from "node:path";
import { VERY_NARROW_LAYOUT_BREAKPOINT_COLS } from "../constants.js";

interface HeaderProps {
  rootDirectory: string;
  terminalColumns: number;
}

const HOME_URL_LABEL = "react.doctor";

const formatProjectPath = (rootDirectory: string): string => {
  const homeDirectory = os.homedir();
  if (homeDirectory && rootDirectory.startsWith(homeDirectory)) {
    return path.join("~", rootDirectory.slice(homeDirectory.length));
  }
  return rootDirectory;
};

export const Header = ({ rootDirectory, terminalColumns }: HeaderProps) => {
  const isCompact = terminalColumns < VERY_NARROW_LAYOUT_BREAKPOINT_COLS;
  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Text color="gray">{formatProjectPath(rootDirectory)}</Text>
      {!isCompact ? <Text color="gray">{HOME_URL_LABEL}</Text> : null}
    </Box>
  );
};
