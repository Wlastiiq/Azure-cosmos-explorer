import * as DataModels from "../Contracts/DataModels";
import * as ViewModels from "../Contracts/ViewModels";

export function buildDocumentsQuery(
  filter: string,
  partitionKeyProperty: string,
  partitionKey: DataModels.PartitionKey
): string {
  let query = partitionKeyProperty
    ? `select c.id, c._self, c._rid, c._ts, ${buildDocumentsQueryPartitionProjections(
        "c",
        partitionKey
      )} as _partitionKeyValue from c`
    : `select c.id, c._self, c._rid, c._ts from c`;

  if (filter) {
    query += " " + filter;
  }

  return query;
}

export function buildDocumentsQueryPartitionProjections(
  collectionAlias: string,
  partitionKey?: DataModels.PartitionKey
): string {
  if (!partitionKey) {
    return "";
  }

  // e.g., path /order/id will be projected as c["order"]["id"],
  // to escape any property names that match a keyword
  const projections = [];
  for (const index in partitionKey.paths) {
    // TODO: Handle "/" in partition key definitions
    const projectedProperties: string[] = partitionKey.paths[index].split("/").slice(1);
    let projectedProperty = "";

    projectedProperties.forEach((property: string) => {
      const projection = property.trim();
      if (projection.length > 0 && projection.charAt(0) !== "'" && projection.charAt(0) !== '"') {
        projectedProperty += `["${projection}"]`;
      } else if (projection.length > 0 && projection.charAt(0) === "'") {
        // trim single quotes and escape double quotes
        const projectionSlice = projection.slice(1, projection.length - 1);
        projectedProperty += `["${projectionSlice.replace(/\\"/g, '"').replace(/"/g, '\\\\\\"')}"]`;
      } else {
        projectedProperty += `[${projection}]`;
      }
    });

    projections.push(`${collectionAlias}${projectedProperty}`);
  }

  return projections.join(",");
}

export const queryPagesUntilContentPresent = async (
  firstItemIndex: number,
  queryItems: (itemIndex: number) => Promise<ViewModels.QueryResults>
): Promise<ViewModels.QueryResults> => {
  let roundTrips = 0;
  let netRequestCharge = 0;
  const doRequest = async (itemIndex: number): Promise<ViewModels.QueryResults> => {
    const results = await queryItems(itemIndex);
    roundTrips = roundTrips + 1;
    results.roundTrips = roundTrips;
    results.requestCharge = Number(results.requestCharge) + netRequestCharge;
    netRequestCharge = Number(results.requestCharge);
    const resultsMetadata = {
      hasMoreResults: results.hasMoreResults,
      itemCount: results.itemCount,
      firstItemIndex: results.firstItemIndex,
      lastItemIndex: results.lastItemIndex,
    };
    if (resultsMetadata.itemCount === 0 && resultsMetadata.hasMoreResults) {
      return await doRequest(resultsMetadata.lastItemIndex);
    }
    return results;
  };

  return await doRequest(firstItemIndex);
};
