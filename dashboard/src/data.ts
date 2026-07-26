import steward from '../../core/steward.json';

export const repository = steward.repository;

export const repositoryUrl = `https://github.com/${steward.repository}`;


const messageFiles = import.meta.glob( '../../core/messages/*.md', { query : '?raw', import : 'default', eager : true } ) as Record<string, string>;
const maintainerFiles = import.meta.glob( '../../core/maintainers/*.md', { query : '?raw', import : 'default', eager : true } ) as Record<string, string>;
const reportFiles = import.meta.glob( '../../core/reports/*.md', { query : '?raw', import : 'default', eager : true } ) as Record<string, string>;


function parseFrontmatter( text : string ) : { data : Record<string, string>; body : string }
{
	const fenced = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec( text );

	if( ! fenced ) return { data : {}, body : text.trim() };

	const data : Record<string, string> = {}

	for( const line of fenced[ 1 ].split( /\r?\n/ ) )
	{
		const pair = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec( line );

		if( pair ) data[ pair[ 1 ] ] = pair[ 2 ].trim();
	}

	return { data, body: text.slice( fenced[ 0 ].length ).trim() };
}


function stem( path : string ) : string
{
	return path.split( '/' ).pop()!.replace( /\.md$/, '' );
}

export type MessageKind = 'reminder' | 'staleness' | 'silence' | 'cap' | 'concerns' | 'reviewer' | ( string & {} )

export interface Message
{
	id : string
	number : number
	kind : MessageKind
	run : string
	item : string
	title : string
	summary : string
	judgedAgainst : string
	context : string
	isPr : boolean
	mentions : string[]
	body : string
	frontmatter : Record<string, string>
}

export interface Maintainer
{
	handle : string
	body : string
}

export interface Report
{
	id : string
	date : string
	workflow : string
	body : string
}

export const maintainers : Maintainer[] = Object.entries( maintainerFiles )
	.map( ( [ path, raw ] ) : Maintainer => ( { handle : stem( path ), body : raw.trim() } ) )
	.sort( ( a, b ) => a.handle.localeCompare( b.handle ) );


const maintainerHandles = new Set( maintainers.map( maintainer => maintainer.handle ) );


function mentionsIn( body : string ) : string[]
{
	return maintainers
		.map( m => ( { handle : m.handle, at : body.search( new RegExp( `(?<![\\w-])@?${m.handle}(?![\\w-])`, 'i' ) ) } ) )
		.filter( m => m.at !== -1 )
		.sort( ( a, b ) => a.at - b.at )
		.map( m => m.handle );
}

export const messages : Message[] = Object.entries( messageFiles )
	.map( ( [ path, raw ] ) : Message =>
	{
		const id = stem( path );
		const { data, body } = parseFrontmatter( raw );
		const item = data.item ?? '';
		const to = data.to ?? '';
		const mentioned = mentionsIn( body );

		return {
			id,
			number : parseInt( id, 10 ) || 0,
			kind : data.kind ?? 'unknown',
			run : data.run ?? '',
			item,
			title : data.title ?? '',
			summary : data.summary ?? '',
			judgedAgainst : data.judged_against ?? '',
			context : data.context ?? '',
			isPr : item.includes( '/pull/' ),
			mentions : maintainerHandles.has( to ) ? [ to, ...mentioned.filter( handle => handle !== to ) ] : mentioned,
			body,
			frontmatter : data,
		}
	} )
	.sort( ( a, b ) => b.number - a.number );


export const reports : Report[] = Object.entries( reportFiles )
	.map( ( [ path, raw ] ) : Report =>
	{
		const id = stem( path );
		const split = /^(\d{4}-\d{2}-\d{2})-(.+)$/.exec( id );

		return {
			id,
			date : split ? split[ 1 ] : '',
			workflow : split ? split[ 2 ] : id,
			body : raw.trim()
		}
	} )
	.sort( ( a, b ) => b.date.localeCompare( a.date ) || a.workflow.localeCompare( b.workflow ) );


export const kinds : Record<MessageKind, { label : string; hint : string }> = {
	reminder : {
		label : 'Reminder',
		hint : 'Thirty days of silence, then one warm nudge to whoever the thread waits on. Only new human activity re-arms the clock.',
	},
	staleness : {
		label : 'Staleness',
		hint : 'A judgment against trunk as it stands today, never a timer: the item may already be fixed, obsolete, or superseded. The evidence comes with it, and the human decides.',
	},
	silence : {
		label : 'Silence',
		hint : 'The steward was not sure enough to speak. It writes the uncertainty down rather than post a half-confident judgment.',
	},
	cap : {
		label : 'PR cap',
		hint : 'About five open non-draft PRs is the ceiling, because opening one costs far less than reviewing it. A friendly note to the author, never a block.',
	},
	concerns : {
		label : 'Concerns',
		hint : 'What stands between the item and a review: several stories in one PR, no way to see it works, or AI-assisted work nobody owns.',
	},
	reviewer : {
		label : 'Reviewer',
		hint : 'Who could review, and why: a first reviewer and a backup for availability. Never the author, and never an approval — the human decides.',
	}
}


export const kindOrder : MessageKind[] = Object.keys( kinds );


export function countBy<T>( items : T[], key : ( item : T ) => string ) : Map<string, number>
{
	const counts = new Map<string, number>();

	for( const item of items )
	{
		const k = key( item );

		counts.set( k, ( counts.get( k ) ?? 0 ) + 1 );
	}

	return counts;
}
