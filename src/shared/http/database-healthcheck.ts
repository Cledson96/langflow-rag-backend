export interface DatabaseHealthcheck {
  isHealthy(): Promise<boolean>;
}

export const alwaysHealthyDatabase: DatabaseHealthcheck = {
  async isHealthy() {
    return true;
  },
};
