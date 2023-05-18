const {getDatabaseStatement, getDatabaseAlterStatement} = require('../databaseHelper')
const {dependencies} = require('../appDependencies');
const {getEntityData, getIsChangeProperties} = require('../../utils/generalUtils');
const {getAlterCommentsScript} = require("./containerHelpers/commentsHelper");

let _;

const containerProperties = ['comment', 'location', 'dbProperties', 'description'];
const otherContainerProperties = ['name', 'location'];

const setDependencies = ({lodash}) => _ = lodash;

const getContainerData = compMod => getEntityData(compMod, containerProperties);

const hydrateDrop = container => {
    const {role} = container;
    return role?.code || role?.name;
};

/**
 * @return {string}
 * */
const getAddContainerScript = container => {
    const dataContainer = [container.role || {}]
    return getDatabaseStatement(dataContainer);
};

/**
 * @return {(container: Object) => string}
 * */
const getDeleteContainerScript = provider => container => {
    const hydratedDrop = hydrateDrop(container);
    return provider.dropDatabase(hydratedDrop);
};

const extractNamesFromCompMod = (compMod) => {
    const extractName = type => compMod.code?.[type] || compMod.name?.[type];
    return {
        new: extractName('new'),
        old: extractName('old')
    };
}

/**
 * @return {(container: Object) => Array<string>}
 * */
const getModifyContainerScript = provider => container => {
    setDependencies(dependencies);
    const compMod = _.get(container, 'role.compMod', {});
    const names = extractNamesFromCompMod(compMod);

    const didPropertiesChange = getIsChangeProperties(_)({...compMod, name: names}, otherContainerProperties);
    const containerData = {...getContainerData(compMod), name: names.new};
    if (!didPropertiesChange) {
        const alterCommentsScript = getAlterCommentsScript(provider)(container);
        const alterDatabaseScript = getDatabaseAlterStatement([containerData]);
        return [
            alterCommentsScript,
            alterDatabaseScript,
        ].filter(Boolean).join('\n\n');
    }
    const hydratedDrop = hydrateDrop({role: {...containerData, name: names.old}});
    const deletedScript = provider.dropDatabase(hydratedDrop);
    const addedScript = getAddContainerScript({role: containerData});

    return [deletedScript, addedScript];
};

module.exports = {
    getAddContainerScript,
    getDeleteContainerScript,
    getModifyContainerScript
}
