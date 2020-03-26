/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Client, ClientConfig } from 'pg';
import pgStructure from 'pg-structure';
import * as vscode from 'vscode';
import { AzureParentTreeItem, ISubscriptionContext } from 'vscode-azureextensionui';
import { getThemeAgnosticIconPath } from '../../constants';
import { nonNullProp } from '../../utils/nonNull';
import { PostgresSchemaTreeItem } from './PostgresSchemaTreeItem';
import { PostgresServerTreeItem } from './PostgresServerTreeItem';

export class PostgresDatabaseTreeItem extends AzureParentTreeItem<ISubscriptionContext> {
    public static contextValue: string = "postgresDatabase";
    public readonly contextValue: string = PostgresDatabaseTreeItem.contextValue;
    public readonly childTypeLabel: string = "Schema";
    public readonly databaseName: string;
    public readonly parent: PostgresServerTreeItem;

    constructor(parent: PostgresServerTreeItem, databaseName: string) {
        super(parent);
        this.databaseName = databaseName;
    }

    public get label(): string {
        return this.databaseName;
    }

    public get id(): string {
        return this.databaseName;
    }

    public get iconPath(): string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri } {
        return getThemeAgnosticIconPath('Database.svg');
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async loadMoreChildrenImpl(_clearCache: boolean): Promise<PostgresSchemaTreeItem[]> {
        const user: string = nonNullProp(process.env, 'POSTGRES_USERNAME');
        const fullUsername = user + "@" + nonNullProp(this.parent.server, 'name');
        const password: string = nonNullProp(process.env, 'POSTGRES_PASSWORD');
        const sslString = process.env.POSTGRES_SSL;
        const ssl: boolean = sslString === 'true';
        const host: string = nonNullProp(this.parent.server, 'fullyQualifiedDomainName');
        const clientConfig: ClientConfig = { user: fullUsername, password: password, ssl: ssl, host: host, port: 5432, database: this.databaseName };
        const accountConnection = new Client(clientConfig);

        await this.parent.checkAndConfigureFirewall();
        const db = await pgStructure(accountConnection);
        return db.schemas.map(schema => new PostgresSchemaTreeItem(this, schema));
    }
}
